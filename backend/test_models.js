const dotenv = require('dotenv');
dotenv.config();

const fetchModels = async () => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Available Models:");
    if (data.models) {
      data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${m.name} (generateContent supported)`);
        }
      });
    } else {
      console.log(data);
    }
  } catch (error) {
    console.error(error);
  }
};

fetchModels();
