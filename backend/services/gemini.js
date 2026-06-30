const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const classifyIssue = async (title, description, imageUrls = []) => {
  try {
    const prompt = `
      You are an AI assistant for a civic issue reporting system.
      Analyze the following issue report:
      Title: ${title}
      Description: ${description}
      
      Determine the following:
      1. Category (choose from: Garbage, Road Damage, Water Leakage, Street Light, Illegal Dumping, Traffic, Public Property Damage, Animal Issue, Emergency, Other)
      2. Severity (choose from: Low, Medium, High, Critical)
      3. A short, concise summary (max 2 sentences).
      4. Estimated Department responsible.
      
      Return ONLY a JSON object with keys: category, severity, summary, department. Do not include markdown formatting like \`\`\`json.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    const text = response.text.trim();
    
    // Clean up any potential markdown wrapping
    const jsonStr = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Gemini Classification Error:', error);
    return {
      category: 'Other',
      severity: 'Medium',
      summary: 'Could not generate summary.',
      department: 'General'
    };
  }
};

const analyzeImage = async (imageUrl) => {
  try {
    // Fetch image and convert to base64
    const responseData = await fetch(imageUrl);
    const arrayBuffer = await responseData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = responseData.headers.get('content-type') || 'image/jpeg';
    
    const imagePart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType
      }
    };

    const prompt = `
      You are an AI assistant for a civic issue reporting system.
      Analyze the attached image and generate:
      1. A short, descriptive title (e.g. "Deep Pothole on Main Road").
      2. A concise description of the issue.
      3. Category (choose from: Garbage, Road Damage, Water Leakage, Street Light, Illegal Dumping, Traffic, Public Property Damage, Animal Issue, Emergency, Other)
      4. Severity (choose from: Low, Medium, High, Critical)
      
      Return ONLY a JSON object with keys: title, description, category, severity. Do not include markdown formatting like \`\`\`json.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, imagePart]
    });
    
    const text = response.text.trim();
    const jsonStr = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Gemini Image Analysis Error:', error);
    return { title: 'New Civic Issue', description: 'Please provide a description of this issue.', category: 'Other', severity: 'Medium' };
  }
};

const detectDuplicate = async (newIssue, nearbyIssues) => {
  try {
    if (!nearbyIssues || nearbyIssues.length === 0) return { isDuplicate: false };

    const prompt = `
      Analyze the following new issue report against a list of nearby existing issues to determine if it is a duplicate of the SAME real-world problem.
      
      New Issue:
      Title: ${newIssue.title}
      Description: ${newIssue.description}
      
      Nearby Issues:
      ${nearbyIssues.map(i => `ID: ${i._id} | Title: ${i.title} | Description: ${i.description}`).join('\n')}
      
      Is the New Issue highly likely to be a duplicate of one of the Nearby Issues?
      If yes, return the ID of the duplicate issue and a confidence score (0-100).
      If no, return null for ID.
      
      Return ONLY a JSON object with keys: isDuplicate (boolean), duplicateIssueId (string or null), confidenceScore (number). Do not include markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    
    const text = response.text.trim();
    const jsonStr = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Gemini Duplicate Detection Error:', error);
    return { isDuplicate: false, duplicateIssueId: null, confidenceScore: 0 };
  }
};

module.exports = { classifyIssue, detectDuplicate, analyzeImage };
