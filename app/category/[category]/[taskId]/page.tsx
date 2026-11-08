// app/category/[category]/[taskId]/page.tsx
import { getActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";
import { comments } from "@/lib/comments";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PdfPreviewLarge } from "@/components/task/FilePreview";
import TaskMeta from "@/components/task/TaskMeta";
import DeleteTaskButton from "@/components/task/DeleteTaskButton";
import TaskCommentsSection from "@/components/comments/TaskCommentsSection";
import { MarkTaskOpened } from "@/components/shell/UnreadCount";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ category: string; taskId: string }>;
}) {
  const { category, taskId } = await params;

  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  // Taken before the Task is read: anything newer may be missing from it, so stays Unread.
  const shownAt = new Date();
  const task = await tasks.get(actor, taskId);
  if (!task) return notFound();

  const taskComments = await comments.list(actor, taskId);

  const isOwner = task.userId === actor.id;

  // Helpers to check for file types
  const hasVideos = task.files.some((f) => f.fileType.startsWith("video/"));
  const hasOtherFiles = task.files.some((f) => !f.fileType.startsWith("video/"));

  return (
    <div className="flex flex-col gap-4 justify-center items-center mx-auto p-4 w-full max-w-md md:max-w-3xl overflow-x-hidden">
      <MarkTaskOpened taskId={task.id} shownAt={shownAt} />
      <div className="bg-white rounded-xl shadow-xl p-6 relative w-full border border-gray-100 min-w-0">
        {/* Header Metadata */}
        <div className="border-b border-gray-100 pb-4 mb-4">
          <h1 className="text-2xl font-bold text-tertiary-brown mb-2 wrap-break-word">
            {task.title}
          </h1>
          <TaskMeta task={task} />
        </div>

        {/* Text Description */}
        <p className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word leading-relaxed mb-8 bg-gray-50/50 p-4 rounded-lg border border-gray-100 w-full overflow-hidden">
          {task.description}
        </p>

        {/* Image/PDF/Video Attachment Thumbnails */}
        {task.files && task.files.length > 0 && (
          <div className="mb-4">
            {/* 1. Video Playback Section (Inline player for immediate viewing) */}
            {hasVideos && (
              <div className="mb-4 pb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Видеa
                </h3>
                <div className="flex flex-col gap-6">
                  {task.files
                    .filter((f) => f.fileType.startsWith("video/"))
                    .map((file) => (
                      <div
                        key={file.id}
                        className="w-full rounded-lg overflow-hidden border border-gray-200 bg-black"
                      >
                        {/* Fetched in byte ranges as it plays; #t=0.1 shows the first frame on iPhones. */}
                        <video
                          src={`/api/files/${file.id}#t=0.1`}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full animate-all"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 2. Attached Files Section (Only rendered if there are actual non-video files) */}
            {hasOtherFiles && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Прикачени файлове
                </h3>
                <div className="flex justify-center flex-wrap gap-4">
                  {task.files
                    .filter((f) => !f.fileType.startsWith("video/"))
                    .map((file) => {
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
                              className="w-32 h-32 object-cover rounded-md border border-gray-200 hover:border-primary-gold transition-all hover:scale-105"
                            />
                          ) : (
                            <PdfPreviewLarge
                              fileName={file.fileName}
                              styleCondition={task.isDone}
                            />
                          )}
                        </a>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex gap-4 justify-end mt-2 pt-2 border-t border-gray-100">
          <Link
            href={`/category/${category}`}
            className="px-4 py-4 rounded-md text-gray-600 text-sm hover:bg-gray-100 transition font-medium"
          >
            Назад
          </Link>

          {/* EDIT BUTTON (Only visible to the owner of the task) */}
          {isOwner && (
            <Link
              href={`/category/${category}/${task.id}/edit`}
              className="px-2 py-4 bg-primary-gold hover:brightness-95 text-on-gold rounded-md text-sm font-bold transition shadow-sm"
            >
              Редактирай
            </Link>
          )}
          {isOwner && <DeleteTaskButton taskId={task.id} />}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl p-4 w-full border border-gray-100 min-w-0">
        <h2 className="text-lg font-bold mb-4 text-tertiary-brown border-b border-gray-100 pb-4">
          Коментари
        </h2>
        <TaskCommentsSection
          taskId={task.id}
          taskOwnerId={task.userId}
          initialComments={taskComments}
          currentUserId={actor.id}
        />
      </div>
    </div>
  );
}
