import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Resend } from "resend";
import { cors } from "@elysiajs/cors";
import { PDFDocument } from 'pdf-lib';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const resend = new Resend(process.env.RESEND_API_KEY);

const app = new Elysia()
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

        const signLink = `http://localhost:5173/sign/${document.id}`;

        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: signerEmail,
          subject: "Signature Requested: " + file.name,
          html: `<p>${senderEmail} has requested your signature.</p>
                 <p><a href="${signLink}">Click here to sign the document</a></p>`,
        });

        return {
          success: true,
          documentId: document.id,
          message: "Document uploaded and email sent successfully",
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
        const { signatureBase64 } = body as { signatureBase64: string };

        const document = await prisma.document.findUnique({
          where: { id: params.id },
        });

        if (!document) {
          set.status = 404;
          return { success: false, error: "Document not found" };
        }

        const pdfDoc = await PDFDocument.load(document.pdfData);
        
        const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, "");
        const signatureImageBytes = Buffer.from(base64Data, 'base64');
        const pngImage = await pdfDoc.embedPng(signatureImageBytes);

        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        
        const pngDims = pngImage.scale(0.5);

        lastPage.drawImage(pngImage, {
          x: 50,
          y: 50,
          width: pngDims.width,
          height: pngDims.height,
        });

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

        await resend.emails.send({
          from: "onboarding@resend.dev", 
          to: document.senderEmail,
          subject: "Document Signed: " + document.filename,
          html: `<p>Great news! ${document.signerEmail} has securely signed your document.</p>`,
        });

        return { success: true, message: "Document signed successfully!" };
      } catch (error) {
        console.error("Signing error:", error);
        set.status = 500;
        return { success: false, error: "Failed to sign document" };
      }
    }
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);