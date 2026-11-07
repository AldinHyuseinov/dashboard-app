BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[user] ADD [lastFeedVisitAt] DATETIME2;

-- CreateTable
CREATE TABLE [dbo].[TaskOpening] (
    [userId] NVARCHAR(1000) NOT NULL,
    [taskId] NVARCHAR(1000) NOT NULL,
    [openedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TaskOpening_pkey] PRIMARY KEY CLUSTERED ([userId],[taskId])
);

-- AddForeignKey
ALTER TABLE [dbo].[TaskOpening] ADD CONSTRAINT [TaskOpening_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[user]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

