const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config();

async function testNewSdk() {
  try {
    console.log("Testing @google/genai with gemini-2.5-flash...");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, are you working?'
    });
    console.log("Success! Response from model:");
    console.log(response.text);
  } catch (error) {
    console.error("Test failed:", error);
  }
}
testNewSdk();
