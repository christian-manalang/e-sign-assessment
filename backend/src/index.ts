/**
 * NOTE:
 * Nodemailer email functionality is fully implemented but currently disabled in this production build.
 * * Reason: The backend is hosted on Render's Free Tier, which strictly blocks outbound 
 * SMTP traffic on ports 25, 465, and 587 to prevent spam. Attempting to connect to 
 * smtp.gmail.com results in an immediate ECONNREFUSED or a 120-second connection timeout.
 * * For this live demonstration, email sending is simulated via console.log so the core
 * database and PDF manipulation features can be evaluated without network hanging.
 */

import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { cors } from "@elysiajs/cors";
import { PDFDocument } from 'pdf-lib';
import nodemailer from "nodemailer";

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const app = new Elysia()
  .use(cors())
  .post(
    "/api/request",
    async ({ body, set }) => {
      try {
        const { file, senderEmail, signerEmail } = body;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const document = await prisma.document.create({
          data: {
            filename: file.name,
            pdfData: buffer,
            senderEmail,
            signerEmail,
            status: "PENDING",
          },
        });

        const signLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${document.id}`;

        // SIMULATED EMAIL TO BYPASS RENDER FREE TIER BLOCK
        console.log(`[SIMULATED EMAIL] Signature requested sent to: ${signerEmail}`);
        console.log(`[SIMULATED EMAIL] Sign Link: ${signLink}`);
        
        /* await transporter.sendMail({
          from: `"E-Sign Service" <${process.env.GMAIL_USER}>`,
          to: signerEmail,
          subject: "Signature Requested: " + file.name,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2>Signature Requested</h2>
              <p><strong>${senderEmail}</strong> has requested your signature on <strong>${file.name}</strong>.</p>
              <p style="margin: 30px 0;">
                <a href="${signLink}" style="background: #18181b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Review & Sign Document
                </a>
              </p>
              <p style="font-size: 12px; color: #666;">If the button doesn't work, copy this link: ${signLink}</p>
            </div>
          `,
        });
        */

        return {
          success: true,
          documentId: document.id,
          message: "Document uploaded successfully (Email simulated)",
        };
      } catch (error) {
        console.error("Upload error:", error);
        set.status = 500;
        return { success: false, error: "Failed to upload document" };
      }
    },
    {
      body: t.Object({
        file: t.File(),
        senderEmail: t.String({ format: "email" }),
        signerEmail: t.String({ format: "email" }),
      }),
    }
  )
  .get(
    "/api/document/:id",
    async ({ params, set }) => {
      try {
        const document = await prisma.document.findUnique({
          where: { id: params.id },
        });

        if (!document) {
          set.status = 404;
          return { success: false, error: "Document not found" };
        }

        return {
          success: true,
          document: {
            id: document.id,
            filename: document.filename,
            senderEmail: document.senderEmail,
            signerEmail: document.signerEmail,
            status: document.status,
            pdfBase64: Buffer.from(document.pdfData).toString("base64"), 
          },
        };
      } catch (error) {
        console.error("Fetch error:", error);
        set.status = 500;
        return { success: false, error: "Failed to fetch document" };
      }
    }
  )
  .post(
    "/api/sign/:id",
    async ({ params, body, set }) => {
      try {
        const { signatures } = body as { 
          signatures: Array<{
            image: string;
            x: number;
            y: number;
            scale: number;
            pageNumber: number;
            renderedWidth: number;
          }> 
        };

        const document = await prisma.document.findUnique({
          where: { id: params.id },
        });

        if (!document) {
          set.status = 404;
          return { success: false, error: "Document not found" };
        }

        const pdfDoc = await PDFDocument.load(document.pdfData);
        const pages = pdfDoc.getPages();

        for (const sig of signatures) {
          const base64Data = sig.image.replace(/^data:image\/png;base64,/, "");
          const signatureImageBytes = Buffer.from(base64Data, 'base64');
          const pngImage = await pdfDoc.embedPng(signatureImageBytes);

          const targetPage = pages[sig.pageNumber - 1]; 
          if (!targetPage) continue; 

          const { width: pdfWidth, height: pdfHeight } = targetPage.getSize();
          
          const validRenderedWidth = sig.renderedWidth > 0 ? sig.renderedWidth : 500;
          const scaleRatio = pdfWidth / validRenderedWidth;
          
          const targetHeightOnPdf = 48 * sig.scale * scaleRatio;
          const requiredScale = targetHeightOnPdf / pngImage.height;
          const pngDims = pngImage.scale(requiredScale);

          const pdfX = sig.x * scaleRatio;
          const pdfY = pdfHeight - (sig.y * scaleRatio) - pngDims.height;

          targetPage.drawImage(pngImage, {
            x: pdfX,
            y: pdfY,
            width: pngDims.width,
            height: pngDims.height,
          });
        }

        const signedPdfBytes = await pdfDoc.save();
        const signedBuffer = Buffer.from(signedPdfBytes);

        await prisma.document.update({
          where: { id: params.id },
          data: {
            pdfData: signedBuffer,
            status: "SIGNED",
            signedAt: new Date(),
          },
        });

        // SIMULATED EMAIL TO BYPASS RENDER FREE TIER BLOCK
        console.log(`[SIMULATED EMAIL] Completion notice sent to: ${document.senderEmail}`);

        /*
        await transporter.sendMail({
          from: `"E-Sign Service" <${process.env.GMAIL_USER}>`,
          to: document.senderEmail,
          subject: "Document Signed: " + document.filename,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2 style="color: #10b981;">Success!</h2>
              <p>Your document <strong>${document.filename}</strong> has been signed by <strong>${document.signerEmail}</strong>.</p>
              <p>You can now download the completed version from your dashboard.</p>
            </div>
          `,
        });
        */

        return { success: true, message: "Document signed successfully! (Email simulated)" };
      } catch (error) {
        console.error("Signing error:", error);
        set.status = 500;
        return { success: false, error: "Failed to sign document" };
      }
    }
  )
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);