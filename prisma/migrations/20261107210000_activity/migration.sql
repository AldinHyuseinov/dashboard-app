BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Activity] (
    [id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [actorId] NVARCHAR(1000) NOT NULL,
    [taskId] NVARCHAR(1000) NOT NULL,
    [taskTitle] NVARCHAR(1000) NOT NULL,
    [taskCategory] NVARCHAR(1000) NOT NULL,
    [commentId] NVARCHAR(1000),
    [occurredAt] DATETIME2 NOT NULL,
    CONSTRAINT [Activity_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Activity_occurredAt_id_idx] ON [dbo].[Activity]([occurredAt], [id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Activity_taskId_idx] ON [dbo].[Activity]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Activity_commentId_idx] ON [dbo].[Activity]([commentId]);

-- AddForeignKey
ALTER TABLE [dbo].[Activity] ADD CONSTRAINT [Activity_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Activity] ADD CONSTRAINT [Activity_commentId_fkey] FOREIGN KEY ([commentId]) REFERENCES [dbo].[Comment]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

