import { transporter } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { navLinks } from "@/lib/types";

export async function sendBulkNotification({
  actorId,
  action,
  category,
}: {
  actorId: string;
  action: string;
  category: string;
}) {
  try {
    // 1. Get all users except the one who did the action
    const recipients = await prisma.user.findMany({
      where: { id: { not: actorId } },
      select: { email: true },
    });

    if (recipients.length === 0) return;

    const emailList = recipients.map((r) => r.email);
    const categoryLabel = getCategoryLabel(category);

    // 2. Send the mail
    void transporter.sendMail({
      from: `"AVEXIM Система" <${process.env.SMTP_USER}>`,
      to: emailList,
      subject: "Известие за задача",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; background-color: #f9f9f9;">
            <h3 style="color: #CDA349;">${action} задача в категория: ${categoryLabel}</h3>
            <p style="font-size: 12px; color: #888; border-top: 1px solid #eee; pt-10;">
            Това е автоматично системно известие.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.log("Task Notification Email Failed:", err);
  }
}

function getCategoryLabel(category: string): string {
  for (const link of navLinks) {
    // Check top level
    if (link.href.replace("/", "") === category) return link.label;

    // Check dropdowns
    if (link.dropdown) {
      const subItem = link.dropdown.find((d) => d.href.replace("/", "") === category);
      if (subItem) return subItem.label;
    }
  }
  // Fallback to the database string if no match found
  return category;
}
