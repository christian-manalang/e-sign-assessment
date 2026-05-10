import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { cors } from "@elysiajs/cors";
import { PDFDocument } from 'pdf-lib';
import { sendSignatureRequest, sendCompletionNotice } from "./services/emailService";

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

        try {
          await sendSignatureRequest(signerEmail, file.name, document.id);
          console.log(`[EMAIL] Signature request sent to: ${signerEmail}`);
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }

        return {
          success: true,
          documentId: document.id,
          message: "Document uploaded successfully",
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

        try {
          await sendCompletionNotice(document.senderEmail, document.signerEmail, document.filename);
          console.log(`[EMAIL] Completion notice sent to: ${document.senderEmail}`);
        } catch (emailError) {
          console.error("Failed to send completion email:", emailError);
        }

        return { success: true, message: "Document signed successfully!" };
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