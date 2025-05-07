import { Request, Response } from "express";
const { GoogleGenAI, Modality } = require("@google/genai");
import * as fs from "node:fs";

interface StoryGen {
  type: string;
  content: string;
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateAIStory = async ({ storyText }: { storyText: string }) => {
  const storyResponse = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Write a 5-page story based on this idea: ${storyText}.`,
  });

  if (!storyResponse?.candidates?.length) {
    throw new Error("No story candidates in response");
  }

  const fullStory = storyResponse.candidates[0].content.parts[0].text;
  const storyPages = fullStory.split(/Page\s+\d+:?/i).filter(Boolean);

  const finalPageContent: { text: string; image: string }[] = [];

  for (let i = 0; i < storyPages.length; i++) {
    const pageText = storyPages[i];

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: pageText,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    let imagePath = "";

    for (const part of parts) {
      if (part.inlineData) {
        const imgData = part.inlineData.data;
        const buffer = Buffer.from(imgData, "base64");

        const dirPath = "./public/images";
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        const filename = `page-${i + 1}-${Date.now()}.png`;
        const filePath = `${dirPath}/${filename}`;
        fs.writeFileSync(filePath, buffer);

        imagePath = `/images/${filename}`;
      }
    }

    finalPageContent.push({
      text: pageText.trim(),
      image: imagePath,
    });
  }

  return finalPageContent;
};

export const generateStory = async (req: Request, res: Response) => {
  if (!req.body)
    return res
      .status(400)
      .json({ status: "Failed", message: "Error, no request found" });

  const { type, content } = req.body as StoryGen;

  if (!type || !content || type !== "story_idea") {
    return res.status(400).json({
      status: "failed",
      message: "Invalid request body",
    });
  }

  try {
    const request = await generateAIStory({ storyText: content });

    // console.log("Generated Story:", request);
    res.status(200).json({
      message: "success",
      data: request,
    });
  } catch (error) {
    console.error("Error during story gen", error);
    res.status(500).json({
      status: "failed",
      message: "Error generating story",
    });
  }
};

module.exports = generateStory;
