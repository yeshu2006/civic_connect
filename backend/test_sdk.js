const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Testing gemini-pro...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello, are you working?");
    const text = result.response.text();
    console.log("Success! Response from model:");
    console.log(text);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testGemini();
