import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { auth } from "@clerk/nextjs/server"
import { extractTextFromFile, splitIntoChunks, generateHuggingFaceEmbedding } from "@/lib/embeddings"

// Configure Next.js to accept larger body sizes (App Router)
export const runtime = "nodejs"
export const maxDuration = 60

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    // Use await with auth() to get userId
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 })
    }

    // Get teacher_id from users table using clerk_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        {
          error: "User not found in database. Please contact support.",
          details: userError?.message,
        },
        { status: 404 },
      )
    }

    const formData = await req.formData()
    const fileCount = Number.parseInt(formData.get("count") as string) || 1
    const results: any[] = []
    let totalChunks = 0

    // Process each file
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file_${i}`) as File
      const documentTitle = (formData.get(`title_${i}`) as string) || file?.name || "Untitled Document"

      if (!file) {
        continue
      }

      // Validate file size (50MB limit - adjust as needed)
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        results.push({
          title: documentTitle,
          success: false,
          error: `File ${file.name} too large. Maximum size is 50MB.`,
          chunks: 0,
        })
        continue
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ]

      if (!allowedTypes.includes(file.type)) {
        results.push({
          title: documentTitle,
          success: false,
          error: `Invalid file type for ${file.name}. Please upload PDF, DOCX, or TXT files.`,
          chunks: 0,
        })
        continue
      }

      console.log("Processing file:", file.name, "Type:", file.type, "Size:", file.size)

      try {
        // Extract text from file
        const fullText = await extractTextFromFile(file)

        if (!fullText || fullText.trim().length === 0) {
          results.push({
            title: documentTitle,
            success: false,
            error: `No text could be extracted from ${file.name}`,
            chunks: 0,
          })
          continue
        }

        console.log("Extracted text length:", fullText.length)

        // Split into chunks
        const chunks = splitIntoChunks(fullText, 1000, 200)
        console.log("Created chunks:", chunks.length)

        // Process each chunk and store in database
        const chunkPromises = chunks.map(async (chunk, index) => {
          try {
            const embedding = await generateHuggingFaceEmbedding(chunk)

            // Format embedding as PostgreSQL vector string
            const vectorString = `[${embedding.join(",").replace(/\s/g, "")}]`

            const { data, error } = await supabase
              .from("document_chunks")
              .insert({
                teacher_id: userData.id,
                document_title: documentTitle,
                chunk_text: chunk,
                embedding: vectorString,
              })
              .select()

            if (error) {
              console.error(`Error inserting chunk ${index}:`, error)
              throw error
            }

            return data
          } catch (error) {
            console.error(`Failed to process chunk ${index}:`, error)
            throw error
          }
        })

        await Promise.all(chunkPromises)

        results.push({
          title: documentTitle,
          success: true,
          chunks: chunks.length,
        })

        totalChunks += chunks.length
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        results.push({
          title: documentTitle,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          chunks: 0,
        })
      }
    }

    // Check if at least one file was successfully processed
    const successCount = results.filter((r) => r.success).length
    if (successCount === 0) {
      return NextResponse.json(
        {
          error: "Failed to process any documents",
          details: results,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `${successCount} document(s) processed successfully`,
      results: results,
      totalChunks: totalChunks,
    })
  } catch (error) {
    console.error("Document processing error:", error)
    return NextResponse.json(
      {
        error: "Failed to process documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
