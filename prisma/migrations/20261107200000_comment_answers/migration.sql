BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Comment] ADD [answersId] NVARCHAR(1000);

-- AddForeignKey
ALTER TABLE [dbo].[Comment] ADD CONSTRAINT [Comment_answersId_fkey] FOREIGN KEY ([answersId]) REFERENCES [dbo].[Comment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Backfill: until now a Reply's target was only implied by its "@Name"
-- prefix, so every existing Reply answers its thread's top-level Comment.
-- Dynamic SQL, because the batch is compiled before the new column exists.
EXEC(N'UPDATE [dbo].[Comment] SET [answersId] = [parentId]
  WHERE [parentId] IS NOT NULL AND [answersId] IS NULL;');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
