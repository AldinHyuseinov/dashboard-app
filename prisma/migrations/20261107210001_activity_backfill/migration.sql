BEGIN TRY

BEGIN TRAN;

-- Backfill the Activity Feed from existing data, so it isn't empty on launch
-- day. Only Task creations, Comments and Replies can be recovered: past edits,
-- deletions and Done marks were never recorded. Each Activity takes its
-- original creation time and the Task's current title and Category.

INSERT INTO [dbo].[Activity]
  ([id], [type], [actorId], [taskId], [taskTitle], [taskCategory], [commentId], [occurredAt])
SELECT
  LOWER(CONVERT(NVARCHAR(36), NEWID())), N'task-created', t.[userId], t.[id], t.[title],
  t.[category], NULL, t.[createdAt]
FROM [dbo].[Task] t;

-- A Comment with a top-level Comment above it is a Reply.
INSERT INTO [dbo].[Activity]
  ([id], [type], [actorId], [taskId], [taskTitle], [taskCategory], [commentId], [occurredAt])
SELECT
  LOWER(CONVERT(NVARCHAR(36), NEWID())),
  CASE WHEN c.[parentId] IS NULL THEN N'comment-posted' ELSE N'reply-posted' END,
  c.[userId], c.[taskId], t.[title], t.[category], c.[id], c.[createdAt]
FROM [dbo].[Comment] c
INNER JOIN [dbo].[Task] t ON t.[id] = c.[taskId];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
