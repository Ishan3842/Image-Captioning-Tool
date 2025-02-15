import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, RefreshCw, Camera, Copy, Check, Share2, Download, Sparkles } from 'lucide-react';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [shortCaption, setShortCaption] = useState<string>('');
  const [detailedCaption, setDetailedCaption] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageStats, setImageStats] = useState<{ size: string; type: string } | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    // Check if Web Share API is supported
    setShareSupported(!!navigator.share);
  }, []);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const resetState = () => {
    setImage(null);
    setShortCaption('');
    setDetailedCaption('');
    setError(null);
    setImageStats(null);
    setShowSuccessAnimation(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateCaptions = async (base64Image: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const [shortResponse, detailedResponse] = await Promise.all([
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Provide a very brief 3-4 word description of this image." },
                { type: "image_url", image_url: { url: base64Image } }
              ],
            },
          ],
          max_tokens: 50,
        }),
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Generate a detailed two-line description of this image." },
                { type: "image_url", image_url: { url: base64Image } }
              ],
            },
          ],
          max_tokens: 150,
        })
      ]);

      setShortCaption(shortResponse.choices[0]?.message?.content || '');
      setDetailedCaption(detailedResponse.choices[0]?.message?.content || '');
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    } catch (err) {
      setError('Error generating caption.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageStats({
        size: formatBytes(file.size),
        type: file.type.split('/')[1].toUpperCase()
      });

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setImage(base64);
        generateCaptions(base64);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleRetry = () => {
    if (image) {
      generateCaptions(image);
    }
  };

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
  };

  const handleShare = async () => {
    const text = `Short caption: ${shortCaption}\n\nDetailed caption: ${detailedCaption}`;
    
    if (shareSupported) {
      try {
        await navigator.share({
          title: 'AI Generated Image Caption',
          text: text,
        });
      } catch (err) {
        // If share fails, fallback to copy
        if (err instanceof Error && err.name !== 'AbortError') {
          handleCopyCaption(text);
        }
      }
    } else {
      // Fallback to copy if share is not supported
      handleCopyCaption(text);
    }
  };

  const handleDownload = () => {
    if (image) {
      const link = document.createElement('a');
      link.href = image;
      link.download = 'captioned-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            AI Image Caption Generator
            <Sparkles className="w-8 h-8 text-indigo-500" />
          </h1>
          <p className="text-lg text-gray-600">
            Transform your images into words with AI-powered captions
          </p>
        </div>

        {!image && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 transform transition-all hover:scale-[1.02]">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${isDragActive 
                  ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
                  : 'border-gray-300 hover:border-indigo-400'
                }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Upload className="w-16 h-16 text-gray-400" />
                  <Camera className="w-8 h-8 text-indigo-500 absolute -bottom-2 -right-2" />
                </div>
                <div className="text-gray-600">
                  <p className="font-medium text-xl mb-2">Drop your image here, or click to select</p>
                  <p className="text-sm">PNG, JPG, JPEG, or GIF (max. 10MB)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {image && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 transform transition-all">
            <div className="relative">
              <img
                src={image}
                alt="Uploaded preview"
                className="max-h-96 rounded-lg object-contain mx-auto mb-6"
              />
              {imageStats && (
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {imageStats.size} • {imageStats.type}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={resetState}
                className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Another
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center p-8 bg-white rounded-2xl shadow-xl mb-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-500" />
            <p className="text-gray-600">Analyzing image and generating captions...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-8 bg-red-50 rounded-2xl shadow-xl mb-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        )}

        {(shortCaption || detailedCaption) && !loading && (
          <div className={`bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-500 ${showSuccessAnimation ? 'scale-[1.02]' : ''}`}>
            {shortCaption && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-semibold text-gray-900">Brief Description</h2>
                  <button
                    onClick={() => handleCopyCaption(shortCaption)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500" />}
                  </button>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed p-4 bg-gray-50 rounded-lg">{shortCaption}</p>
              </div>
            )}
            {detailedCaption && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-semibold text-gray-900">Detailed Description</h2>
                  <button
                    onClick={() => handleCopyCaption(detailedCaption)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500" />}
                  </button>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed p-4 bg-gray-50 rounded-lg">{detailedCaption}</p>
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleShare}
                className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                title={shareSupported ? "Share captions" : "Copy captions to clipboard"}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {shareSupported ? "Share Captions" : "Copy Captions"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;