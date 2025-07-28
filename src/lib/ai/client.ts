

'use client';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { AddLeadFormValues } from '@/app/leads/components/shared/leadSchemas';
import type { User } from '@supabase/supabase-js';
import type { UserSettings, ResumeData, DefaultFollowUpTemplates } from '../types';

// Zod schema for the expected output when generating a full lead from a job description
const generateLeadOutputSchema = z.object({
  roleTitle: z.string().describe("The role or job title extracted from the description."),
  companyName: z.string().describe("The company name extracted from the description."),
  initialEmail: z.object({
    subject: z.string().describe("Subject line for the initial outreach email."),
    body: z.string().describe("Body content for the initial outreach email, WITHOUT any signature."),
  }),
  followUpOne: z.object({
    subject: z.string().describe("Subject line for the first follow-up email."),
    body: z.string().describe("Body content for the first follow-up email, WITHOUT any signature."),
  }),
  followUpTwo: z.object({
    subject: z.string().describe("Subject line for the second follow-up email."),
    body: z.string().describe("Body content for the second follow-up email, WITHOUT any signature."),
  }),
  followUpThree: z.object({
    subject: z.string().describe("Subject line for the third follow-up email."),
    body: z.string().describe("Body content for the third follow-up email, WITHOUT any signature."),
  }),
});

// Zod schema for the expected output when generating a single follow-up
const singleFollowUpOutputSchema = z.object({
    subject: z.string().describe("The generated subject line for the follow-up email."),
    body: z.string().describe("The generated body content for the follow-up email, WITHOUT any signature."),
});

const getSignature = (user: User | null, userSettings: UserSettings | null): string => {
    const templates = userSettings?.default_email_templates as DefaultFollowUpTemplates | null;
    if (templates && typeof templates === 'object' && templates.sharedSignature) {
        return `\n\n${templates.sharedSignature}`;
    }
    const userName = userSettings?.full_name || user?.user_metadata?.full_name || 'Your Name';
    const userEmail = user?.email || 'your.email@example.com';
    return `\n\nBest Regards,\n${userName}\n${userEmail}`;
};


/**
 * Generates a lead draft (role, company, and 3 follow-ups) from a job description.
 * This function is designed to be called from the client-side.
 * @param apiKey - The user's Gemini API key.
 * @param jobDescription - The full text of the job description.
 * @returns An object with the extracted and generated lead data.
 */
export async function generateLeadFromJD(apiKey: string, jobDescription: string, userContext: string, user: User | null, userSettings: UserSettings | null) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const resumeData = userSettings?.resume as ResumeData | null;
    
    const prompt = `
        You are an expert career advisor and copywriter. Your primary goal is to help a user land a job.
        Analyze the job description below to extract the role title and company name. 
        Then, generate an initial outreach email and three distinct follow-up emails based on the guidelines.
        Personalize the content using the provided resume information and the user's additional context.

        **User's Resume (for personalization):**
        ---
        ${resumeData ? JSON.stringify(resumeData, null, 2) : "No resume data provided."}
        ---
        
        **User's Additional Context (Prioritize this):**
        ---
        ${userContext || "No additional context provided."}
        ---

        **Job Description / Prompt:**
        ---
        ${jobDescription}
        ---

        **CRITICAL INSTRUCTIONS:**
        1.  **ASSUME JOB HUNT CONTEXT**: Always write as a job applicant applying for a role.
        2.  **DO NOT ADD A SIGNATURE**: You MUST NOT add any signature or closing (like "Best regards," or the user's name) to the email bodies.
        3.  **USE RESUME & CONTEXT**: Actively use the resume and user's context to make the email content highly personalized and relevant to the job description. If the user provides specific instructions in the context, prioritize them.
        4.  **JSON Output**: Your entire output must be a single, valid JSON object that conforms to this Zod schema: ${JSON.stringify(generateLeadOutputSchema.shape)}. The keys MUST be exactly "roleTitle", "companyName", "initialEmail", "followUpOne", "followUpTwo", and "followUpThree".

        **GENERATION GUIDELINES:**
        - **Initial Email:** Craft a compelling initial outreach email for the job application.
        - **First Follow-Up (1 week after):** A polite check-in, reinforcing interest in the role.
        - **Second Follow-Up (2 weeks after):** Add value or a new angle relevant to the job.
        - **Third Follow-Up (3 weeks after):** A brief, final check-in to show continued interest.
        
        Return the complete, finalized content for all emails in the specified JSON format.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const parsedJson = JSON.parse(responseText);

    const validatedOutput = generateLeadOutputSchema.safeParse(parsedJson);

    if (!validatedOutput.success) {
        throw new Error(`AI response did not match the expected format. ${validatedOutput.error.message}`);
    }
    
    const signature = getSignature(user, userSettings);
    const userDefaults = userSettings?.default_email_templates as DefaultFollowUpTemplates | null;
    const aiData = validatedOutput.data;

    const followUp1Subject = userDefaults?.followUp1?.subject || aiData.followUpOne.subject;
    const followUp1Body = (userDefaults?.followUp1?.openingLine || aiData.followUpOne.body) + signature;
    
    const followUp2Subject = userDefaults?.followUp2?.subject || aiData.followUpTwo.subject;
    const followUp2Body = (userDefaults?.followUp2?.openingLine || aiData.followUpTwo.body) + signature;

    const followUp3Subject = userDefaults?.followUp3?.subject || aiData.followUpThree.subject;
    const followUp3Body = (userDefaults?.followUp3?.openingLine || aiData.followUpThree.body) + signature;

    const finalReturnObject = {
      roleTitle: aiData.roleTitle,
      companyName: aiData.companyName,
      initialEmail: {
          subject: aiData.initialEmail.subject,
          body: aiData.initialEmail.body + signature
      },
      followUp1: {
        subject: followUp1Subject,
        body: followUp1Body,
      },
      followUp2: {
        subject: followUp2Subject,
        body: followUp2Body,
      },
      followUp3: {
        subject: followUp3Subject,
        body: followUp3Body,
      },
    };
    
    return finalReturnObject;
}

export async function generateInitialEmail(
    apiKey: string,
    context: {
        roleTitle: string;
        companyName: string;
        notes: string;
        contacts: { contactName: string }[];
        user: User | null;
        userSettings: UserSettings | null;
        resumeData: ResumeData | null;
    }
) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
        You are an expert career advisor and copywriter.
        Your task is to generate an initial outreach email for a job application based on the provided context.

        **Lead Context:**
        - **Role Title:** ${context.roleTitle}
        - **Company:** ${context.companyName}
        - **Primary Contact Name:** ${context.contacts[0]?.contactName || 'the Hiring Team'}
        - **Job Description/Notes:**
          ---
          ${context.notes}
          ---
        - **User's Resume (for personalization):**
          ---
          ${context.resumeData ? JSON.stringify(context.resumeData, null, 2) : "No resume data provided."}
          ---

        **TASK:**
        Generate content for the **Initial Email**. The tone should be that of a professional applying for a job.

        **CRITICAL INSTRUCTIONS:**
        1.  **DO NOT ADD A SIGNATURE**: You MUST NOT add any signature or closing to the email body.
        2.  **USE RESUME DATA**: Actively use the resume to make the email personalized.
        3.  **JSON Output**: Your entire output must be a single, valid JSON object that conforms to this Zod schema: ${JSON.stringify(singleFollowUpOutputSchema.shape)}.
        
        Return only the generated subject and body for the initial email.
    `;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedJson = JSON.parse(responseText);
    const validatedOutput = singleFollowUpOutputSchema.safeParse(parsedJson);

    if (!validatedOutput.success) {
        throw new Error(`AI response did not match the expected format. ${validatedOutput.error.message}`);
    }

    const signature = getSignature(context.user, context.userSettings);
    const finalBody = validatedOutput.data.body + signature;

    return {
        subject: validatedOutput.data.subject,
        body: finalBody
    };
}


/**
 * Generates a single follow-up email based on the context of a lead.
 * This function is designed to be called from the client-side.
 */
export async function generateSingleFollowUp(
    apiKey: string,
    context: {
        roleTitle: string;
        companyName: string;
        notes: string; // Job Description
        contacts: { contactName: string }[];
        previousFollowUps: Pick<AddLeadFormValues, 'initialEmail' | 'followUp1' | 'followUp2' | 'followUp3'>;
        user: User | null;
        userSettings: UserSettings | null;
        resumeData: ResumeData | null;
    },
    followUpNumber: 1 | 2 | 3
) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
    
    let generationGuideline = '';
    switch (followUpNumber) {
        case 1:
            generationGuideline = "**First Follow-Up (1 week after):** A polite check-in. Reiterate strong interest. Briefly mention a *different* key skill from the resume that's relevant to the job description. Keep it concise.";
            break;
        case 2:
            generationGuideline = "**Second Follow-Up (2 weeks after):** Add value. Mention a specific project from the resume and briefly explain how its outcome could be valuable to the company's goals as stated in the job description.";
            break;
        case 3:
            generationGuideline = "**Third Follow-Up (3 weeks after):** A brief, final check-in to show continued interest and reaffirm enthusiasm.";
            break;
    }

    const prompt = `
        You are an expert career advisor and copywriter.
        Your task is to generate a single follow-up email for a job application based on the provided context.

        **Lead Context:**
        - **Role Title:** ${context.roleTitle}
        - **Company:** ${context.companyName}
        - **Primary Contact Name:** ${context.contacts[0]?.contactName || 'the Hiring Team'}
        - **Job Description/Notes:**
          ---
          ${context.notes}
          ---
        - **User's Resume (for personalization):**
          ---
          ${context.resumeData ? JSON.stringify(context.resumeData, null, 2) : "No resume data provided."}
          ---
        - **Previous Email Drafts (for context, do not repeat):**
          - Initial Email Subject: ${context.previousFollowUps.initialEmail.subject || 'N/A'}
          - Initial Email Body: ${context.previousFollowUps.initialEmail.body || 'N/A'}
          - Follow-up 1 Subject: ${context.previousFollowUps.followUp1.subject || 'N/A'}
          - Follow-up 1 Body: ${context.previousFollowUps.followUp1.body || 'N/A'}
          - Follow-up 2 Subject: ${context.previousFollowUps.followUp2.subject || 'N/A'}
          - Follow-up 2 Body: ${context.previousFollowUps.followUp2.body || 'N/A'}

        **TASK:**
        Generate content for **Follow-up #${followUpNumber}**.
        
        **Guideline for this specific follow-up:**
        ${generationGuideline}

        **CRITICAL INSTRUCTIONS:**
        1.  **ALWAYS WRITE FOR A JOB HUNT**: The user is applying for a job.
        2.  **DO NOT ADD A SIGNATURE**: You MUST NOT add any signature or closing to the email body.
        3.  **USE RESUME DATA**: Actively use the resume to make the email personalized.
        4.  **JSON Output**: Your entire output must be a single, valid JSON object that conforms to this Zod schema: ${JSON.stringify(singleFollowUpOutputSchema.shape)}.
        
        Return only the generated content for Follow-up #${followUpNumber}.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedJson = JSON.parse(responseText);
    const validatedOutput = singleFollowUpOutputSchema.safeParse(parsedJson);

    if (!validatedOutput.success) {
        throw new Error(`AI response did not match the expected format. ${validatedOutput.error.message}`);
    }
    
    const signature = getSignature(context.user, context.userSettings);
    const finalBody = validatedOutput.data.body + signature;

    return {
        subject: validatedOutput.data.subject,
        body: finalBody
    };
}
