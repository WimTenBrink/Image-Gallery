import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useLogger } from '../hooks/useLogger';
import { LogLevel } from '../types';
import { SparklesIcon } from './Icons';

const AIModal: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const { addLog } = useLogger();

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImageUrl(null);
        addLog(LogLevel.API, 'AI Image Generation Request', { prompt });

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not set.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png', // Use png for better quality
                },
            });
            
            addLog(LogLevel.API, 'AI Image Generation Response', { status: 'Success' });

            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
            setGeneratedImageUrl(imageUrl);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during image generation.';
            setError(errorMessage);
            addLog(LogLevel.ERROR, 'AI Image Generation Failed', { error: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-4">
            {/* Left Panel - Controls */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-gray-200">Image Generation Prompt</h3>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A majestic lion wearing a crown, photorealistic style"
                    className="flex-grow bg-gray-900 border border-gray-600 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary resize-none"
                    rows={10}
                    aria-label="Image generation prompt"
                />
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="flex items-center justify-center w-full px-4 py-3 bg-brand-secondary text-white font-bold rounded-md hover:bg-blue-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Generate Image
                        </>
                    )}
                </button>
            </div>

            {/* Right Panel - Display */}
            <div className="w-full md:w-2/3 h-full bg-gray-900 rounded-md border border-gray-700 flex items-center justify-center p-4">
                {isLoading && (
                    <div className="text-center text-gray-400">
                         <div className="animate-pulse">
                            <SparklesIcon className="w-24 h-24 mx-auto mb-4 text-brand-secondary opacity-50" />
                         </div>
                         <h3 className="text-xl font-semibold">Generating your image...</h3>
                         <p className="mt-2">This can take a moment. Please wait.</p>
                    </div>
                )}
                {error && (
                    <div className="text-center text-red-400 bg-red-900 bg-opacity-30 p-6 rounded-lg">
                        <h3 className="text-xl font-bold mb-2">Generation Failed</h3>
                        <p>{error}</p>
                    </div>
                )}
                {!isLoading && !error && generatedImageUrl && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                         <img src={generatedImageUrl} alt={prompt} className="max-w-full max-h-[85%] object-contain rounded-lg shadow-2xl" />
                         <a href={generatedImageUrl} download="generated-image.png" className="mt-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm">Download Image</a>
                    </div>
                )}
                {!isLoading && !error && !generatedImageUrl && (
                    <div className="text-center text-gray-500">
                        <SparklesIcon className="w-24 h-24 mx-auto mb-4 opacity-30" />
                        <h3 className="text-xl font-semibold">AI Image Generation</h3>
                        <p className="mt-2">Enter a prompt on the left and click "Generate Image" to create something new.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIModal;