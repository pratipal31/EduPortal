'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Wand2, Loader, CheckCircle, AlertCircle, Trash2, Edit3, Save, X } from 'lucide-react';

interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  difficulty: string;
  correct_answer: string;
  options?: string[];
  blanks?: string[];
  match_pairs?: any[];
  points: number;
  explanation: string;
}

export default function UploadDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedChunks, setUploadedChunks] = useState(0);
  
  // Quiz generation state
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savingQuiz, setSavingQuiz] = useState(false);
  
  const [quizConfig, setQuizConfig] = useState({
    title: '',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard' | 'advanced',
    numQuestions: 10,
    duration: 30,
    passingScore: 60,
    questionTypes: {
      multiple_choice: true,
      fill_in_blank: false,
      true_false: false,
      short_answer: false,
      long_answer: false,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(`Document uploaded successfully! Processed ${data.chunks} chunks.`);
      setUploadedChunks(data.chunks);
      setFile(null);
      setTitle('');
      
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!quizConfig.title.trim()) {
      alert('Please enter a quiz title');
      return;
    }

    const selectedTypes = Object.entries(quizConfig.questionTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type);

    if (selectedTypes.length === 0) {
      alert('Please select at least one question type');
      return;
    }

    setGeneratingQuiz(true);
    setShowQuizModal(false);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: quizConfig.title,
          description: quizConfig.description,
          difficulty: quizConfig.difficulty,
          questionTypes: selectedTypes,
          numQuestions: quizConfig.numQuestions,
          duration: quizConfig.duration,
          passingScore: quizConfig.passingScore,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      // Fetch the generated questions to show preview
      const questionsResponse = await fetch(`/api/get-quiz-questions?quiz_id=${data.quiz_id}`);
      const questionsData = await questionsResponse.json();

      if (questionsResponse.ok) {
        setGeneratedQuestions(questionsData.questions);
        setGeneratedQuizId(data.quiz_id);
        setShowPreview(true);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleDeleteQuestion = (index: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index));
    }
  };

  const handleEditQuestion = (index: number, field: string, value: any) => {
    const updated = [...generatedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedQuestions(updated);
  };

  const handlePublishQuiz = async () => {
    if (!generatedQuizId) return;

    setSavingQuiz(true);
    try {
      // Update quiz with edited questions
      const response = await fetch('/api/update-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quiz_id: generatedQuizId,
          questions: generatedQuestions,
          is_published: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish quiz');
      }

      alert('🎉 Quiz published successfully!');
      router.push('/pages-Teacher/MyQuiz');

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish quiz');
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!generatedQuizId) return;

    setSavingQuiz(true);
    try {
      const response = await fetch('/api/update-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quiz_id: generatedQuizId,
          questions: generatedQuestions,
          is_published: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save quiz');
      }

      alert('Quiz saved as draft!');
      router.push('/pages-Teacher/MyQuiz');

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setSavingQuiz(false);
    }
  };

  if (showPreview && generatedQuestions.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{quizConfig.title}</h1>
                <p className="text-sm text-gray-600 mt-1">Review and edit your AI-generated quiz</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSaveAsDraft}
                  disabled={savingQuiz}
                  className="flex-1 sm:flex-none px-4 py-2 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  onClick={handlePublishQuiz}
                  disabled={savingQuiz || generatedQuestions.length === 0}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-bold transition-all disabled:opacity-50"
                >
                  {savingQuiz ? 'Publishing...' : 'Publish Quiz'}
                </button>
              </div>
            </div>
          </div>

          {/* Quiz Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow">
              <p className="text-xs sm:text-sm text-gray-600">Questions</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{generatedQuestions.length}</p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow">
              <p className="text-xs sm:text-sm text-gray-600">Difficulty</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-600 capitalize">{quizConfig.difficulty}</p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow">
              <p className="text-xs sm:text-sm text-gray-600">Duration</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{quizConfig.duration}m</p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow">
              <p className="text-xs sm:text-sm text-gray-600">Pass Score</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{quizConfig.passingScore}%</p>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3 sm:space-y-4">
            {generatedQuestions.map((question, index) => (
              <div key={index} className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                        {index + 1}
                      </span>
                      {editingIndex === index ? (
                        <textarea
                          value={question.question_text}
                          onChange={(e) => handleEditQuestion(index, 'question_text', e.target.value)}
                          className="flex-1 p-2 border rounded-lg text-sm sm:text-base"
                          rows={2}
                        />
                      ) : (
                        <p className="flex-1 font-semibold text-gray-900 text-sm sm:text-base">{question.question_text}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-3 ml-8 sm:ml-11">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {question.question_type.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold capitalize">
                        {question.difficulty}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {question.points} pts
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {editingIndex === index ? (
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Save"
                      >
                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingIndex(index)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteQuestion(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>

                {/* Question Details */}
                <div className="ml-8 sm:ml-11 space-y-3">
                  {/* Options for Multiple Choice */}
                  {question.question_type === 'multiple_choice' && question.options && (
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-gray-700">Options:</p>
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 sm:p-3 rounded-lg text-sm sm:text-base ${
                            option === question.correct_answer
                              ? 'bg-green-50 border-2 border-green-500'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-600">{String.fromCharCode(65 + optIndex)}.</span>
                            {editingIndex === index ? (
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...question.options!];
                                  newOptions[optIndex] = e.target.value;
                                  handleEditQuestion(index, 'options', newOptions);
                                }}
                                className="flex-1 p-1 border rounded text-sm sm:text-base"
                              />
                            ) : (
                              <span className="flex-1">{option}</span>
                            )}
                            {option === question.correct_answer && (
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Correct Answer for other types */}
                  {question.question_type !== 'multiple_choice' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                      <p className="text-xs font-medium text-green-800 mb-1">Correct Answer:</p>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={question.correct_answer}
                          onChange={(e) => handleEditQuestion(index, 'correct_answer', e.target.value)}
                          className="w-full p-2 border rounded text-sm sm:text-base"
                        />
                      ) : (
                        <p className="font-semibold text-green-900 text-sm sm:text-base">{question.correct_answer}</p>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                      <p className="text-xs font-medium text-blue-800 mb-1">Explanation:</p>
                      {editingIndex === index ? (
                        <textarea
                          value={question.explanation}
                          onChange={(e) => handleEditQuestion(index, 'explanation', e.target.value)}
                          className="w-full p-2 border rounded text-sm sm:text-base"
                          rows={2}
                        />
                      ) : (
                        <p className="text-blue-900 text-sm sm:text-base">{question.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-4 mt-6 rounded-t-2xl shadow-lg">
            <div className="flex flex-col sm:flex-row gap-3 max-w-5xl mx-auto">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm sm:text-base"
              >
                Back to Upload
              </button>
              <button
                onClick={handleSaveAsDraft}
                disabled={savingQuiz}
                className="flex-1 px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                Save as Draft
              </button>
              <button
                onClick={handlePublishQuiz}
                disabled={savingQuiz || generatedQuestions.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-bold transition-all disabled:opacity-50 text-sm sm:text-base"
              >
                {savingQuiz ? 'Publishing...' : 'Publish Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Document-Based Quiz Generator
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Upload your teaching materials and let AI create custom quizzes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - Upload Document */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
                  <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upload Document</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Upload your learning materials</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Python Programming Basics"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  <label
                    htmlFor="file-input"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-2 sm:mb-3" />
                    
                    {file ? (
                      <div>
                        <p className="text-blue-600 font-medium text-xs sm:text-sm">{file.name}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600 font-medium text-xs sm:text-sm">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          PDF, DOCX, or TXT (Max 10MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  {uploading ? (
                    <>
                      <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Upload & Process</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-xs sm:text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-800 text-xs sm:text-sm font-medium">{success}</p>
                    <p className="text-green-700 text-xs mt-1">
                      Document is ready for quiz generation! ➡️
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Generate Quiz */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="bg-purple-100 p-2 sm:p-3 rounded-lg">
                  <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Generate Quiz</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Create AI-powered quiz from docs</p>
                </div>
              </div>

              {uploadedChunks > 0 ? (
                <button
                  onClick={() => setShowQuizModal(true)}
                  disabled={generatingQuiz}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-bold text-base sm:text-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  {generatingQuiz ? (
                    <>
                      <Loader className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>Generate Quiz with AI</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                  <p className="text-gray-600 font-medium text-sm sm:text-base mb-1">No documents uploaded yet</p>
                  <p className="text-gray-500 text-xs sm:text-sm">Upload a document first to generate quizzes</p>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-4 sm:mt-6 bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-purple-900 text-xs sm:text-sm mb-2">
                  ✨ AI Quiz Features:
                </h3>
                <ul className="space-y-1 text-xs text-purple-800">
                  <li>• Questions based on YOUR documents</li>
                  <li>• Multiple question types available</li>
                  <li>• Adjustable difficulty levels</li>
                  <li>• Review & edit before publishing</li>
                  <li>• Instant generation in seconds</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Configuration Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Configure Your Quiz</h3>
              <button
                onClick={() => setShowQuizModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Quiz Basic Info */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={quizConfig.title}
                    onChange={(e) => setQuizConfig({ ...quizConfig, title: e.target.value })}
                    placeholder="e.g., Python Variables Quiz"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={quizConfig.description}
                    onChange={(e) => setQuizConfig({ ...quizConfig, description: e.target.value })}
                    placeholder="Brief description of the quiz..."
                    rows={2}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {(['easy', 'medium', 'hard', 'advanced'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setQuizConfig({ ...quizConfig, difficulty: level })}
                      className={`py-2 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                        quizConfig.difficulty === level
                          ? 'bg-purple-600 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                  Question Types * (Select at least one)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { key: 'multiple_choice', label: 'Multiple Choice', icon: '✓' },
                    { key: 'fill_in_blank', label: 'Fill in Blank', icon: '___' },
                    { key: 'true_false', label: 'True/False', icon: 'T/F' },
                    { key: 'short_answer', label: 'Short Answer', icon: '📝' },
                    { key: 'long_answer', label: 'Long Answer', icon: '📄' },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() =>
                        setQuizConfig({
                          ...quizConfig,
                          questionTypes: {
                            ...quizConfig.questionTypes,
                            [key]: !quizConfig.questionTypes[key as keyof typeof quizConfig.questionTypes],
                          },
                        })
                      }
                      className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm text-left transition-all ${
                        quizConfig.questionTypes[key as keyof typeof quizConfig.questionTypes]
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                          : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-base sm:text-lg">{icon}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiz Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Number of Questions
                  </label>
                  <select
                    value={quizConfig.numQuestions}
                    onChange={(e) => setQuizConfig({ ...quizConfig, numQuestions: parseInt(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  >
                    {[5, 10, 15, 20, 25, 30, 40, 50].map((num) => (
                      <option key={num} value={num}>{num} Questions</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <select
                    value={quizConfig.duration}
                    onChange={(e) => setQuizConfig({ ...quizConfig, duration: parseInt(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  >
                    {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((min) => (
                      <option key={min} value={min}>{min} minutes</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Passing Score
                  </label>
                  <select
                    value={quizConfig.passingScore}
                    onChange={(e) => setQuizConfig({ ...quizConfig, passingScore: parseInt(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  >
                    {[40, 50, 60, 70, 80, 90, 100].map((score) => (
                      <option key={score} value={score}>{score}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateQuiz}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-bold transition-all shadow-lg flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Generate Quiz</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}