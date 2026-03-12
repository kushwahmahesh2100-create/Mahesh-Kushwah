import { GoogleGenAI } from "@google/genai";
import { Article } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const askGemini = async (question: string, articles: Article[]) => {
  // Prepare context from articles
  const context = articles.map(a => `
    Article ID: ${a.articleNumber}
    Title: ${a.articleName}
    Category: ${a.category}
    Description: ${a.description}
    Keywords: ${a.vocKeywords}, ${a.hindiKeywords}
  `).join('\n---\n');

  const prompt = `
    You are a Knowledge Management Assistant for telecom advisors. 
    Use the following knowledge base articles to answer the advisor's question.
    If the answer is not in the articles, say you don't have that information in the knowledge base.
    Keep the answer professional, concise, and structured (use bullet points if needed).
    
    Knowledge Base:
    ${context}
    
    Question: ${question}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-latest",
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};
