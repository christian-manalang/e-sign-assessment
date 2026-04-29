import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Resend } from "resend";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const resend = new Resend(process.env.RESEND_API_KEY);

const app = new Elysia()
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
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);