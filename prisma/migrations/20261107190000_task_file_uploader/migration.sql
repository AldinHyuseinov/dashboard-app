BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[TaskFile] ADD [uploaderId] NVARCHAR(1000);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskFile_taskId_createdAt_idx] ON [dbo].[TaskFile]([taskId], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[TaskFile] ADD CONSTRAINT [TaskFile_uploaderId_fkey] FOREIGN KEY ([uploaderId]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Backfill: files already on a Task were uploaded by its Task Owner.
-- Unattached files keep no uploader, so nobody can attach them; cleanup
-- deletes them once they are 24 hours old. Dynamic SQL, because the batch
-- is compiled before the new column exists.
EXEC(N'UPDATE f SET f.[uploaderId] = t.[userId]
  FROM [dbo].[TaskFile] f
  INNER JOIN [dbo].[Task] t ON t.[id] = f.[taskId]
  WHERE f.[uploaderId] IS NULL;');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
