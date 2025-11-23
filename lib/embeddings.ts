// lib/embeddings.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generate embeddings using a free API alternative
 * Since Groq doesn't provide embeddings, we'll use a simple text-based approach
 * For production, consider using OpenAI embeddings or a free alternative like Hugging Face
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // For now, we'll use a simple hash-based embedding
  // In production, replace this with actual embedding model
  // Options: Hugging Face Inference API (free tier), Cohere (free tier)
  
  // Simple placeholder - replace with actual embedding service
  const textHash = hashTextToVector(text, 1536);
  return textHash;
}

// Simple hash function to create a vector representation
function hashTextToVector(text: string, dimension: number): number[] {
  const vector: number[] = new Array(dimension).fill(0);
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = charCode % dimension;
    vector[index] += Math.sin(charCode) * Math.cos(i);
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / (magnitude || 1));
}

/**
 * Split text into chunks for processing
 */
export function splitIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}

/**
 * Extract text from uploaded files
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  
  if (fileType === 'application/pdf') {
    // Handle PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // You'll need to implement PDF parsing
    // For now, return placeholder
    return `Extracted text from PDF: ${file.name}`;
  } 
  else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // Handle DOCX
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // You'll need to implement DOCX parsing
    return `Extracted text from DOCX: ${file.name}`;
  }
  else if (fileType === 'text/plain') {
    // Handle TXT
    return await file.text();
  }
  
  throw new Error('Unsupported file type');
}

/**
 * Better embedding using Hugging Face Inference API (Free)
 */
export async function generateHuggingFaceEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // You can get a free API token from huggingface.co
          // 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
        body: JSON.stringify({ inputs: text }),
      }
    );
    
    if (!response.ok) {
      // Fallback to simple embedding
      return hashTextToVector(text, 384); // all-MiniLM-L6-v2 produces 384-dim vectors
    }
    
    const embedding = await response.json();
    return embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return hashTextToVector(text, 384);
  }
}