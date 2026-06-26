// app/category/[category]/[taskId]/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import TaskCommentsSection from "@/components/task/TaskCommentsSection";
import { PdfPreviewLarge } from "@/components/task/FilePreview";
import TaskMeta from "@/components/task/TaskMeta";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ category: string; taskId: string }>;
}) {
  const { category, taskId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?not-authorized=true");
  }

  // Fetch task with creator, files and comments
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      user: { select: { name: true } },
      files: { select: { id: true, fileName: true, fileType: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!task) return notFound();

  const isOwner = task.userId === session.user.id;

  return (
    <div className="flex flex-col gap-2 justify-center items-center mx-auto p-2 w-full max-w-md md:max-w-3xl overflow-x-hidden">
      <div className="bg-white rounded-xl shadow-xl p-3 relative w-full border border-gray-100 min-w-0">
        {/* Header Metadata */}
        <div className="border-b border-gray-100 pb-2 mb-2">
          <h1 className="text-2xl font-bold text-tertiary-brown mb-1 wrap-break-word">
            {task.title}
          </h1>
          <TaskMeta task={task} />
        </div>

        {/* Text Description */}
        <p className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word leading-relaxed mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100 w-full overflow-hidden">
          {task.description}
        </p>

        {/* Image/PDF Attachment Thumbnails */}
        {task.files && task.files.length > 0 && (
          <div className="mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Прикачени файлове
            </h3>
            <div className="flex justify-center flex-wrap gap-2">
              {task.files.map((file) => {
                const isImage = file.fileType.startsWith("image/");
                return (
                  <a
                    key={file.id}
                    href={`/api/files/${file.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={file.fileName}
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/${file.id}`}
                        alt={file.fileName}
                        className="w-16 h-16 object-cover rounded-md border border-gray-200 hover:border-primary-gold transition-all hover:scale-105"
                      />
                    ) : (
                      <PdfPreviewLarge fileName={file.fileName} styleCondition={task.isDone} />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex gap-2 justify-end mt-1 pt-1 border-t border-gray-100">
          <Link
            href={`/category/${category}`}
            className="px-2 py-2 rounded-md text-gray-600 text-sm hover:bg-gray-100 transition font-medium"
          >
            Назад
          </Link>

          {/* EDIT BUTTON (Only visible to the owner of the task) */}
          {isOwner && (
            <Link
              href={`/category/${category}/${task.id}/edit`}
              className="px-2 py-2 bg-primary-gold hover:bg-secondary-gold-dark text-white rounded-md text-sm font-bold transition shadow-sm"
            >
              Редактирай
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl p-2 w-full border border-gray-100 min-w-0">
        <h2 className="text-lg font-bold mb-2 text-tertiary-brown border-b border-gray-100 pb-2">
          Коментари
        </h2>
        <TaskCommentsSection taskId={task.id} initialComments={task.comments} category={category} />
      </div>
    </div>
  );
}
