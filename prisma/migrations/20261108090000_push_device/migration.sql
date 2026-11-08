BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[PushDevice] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [sessionId] NVARCHAR(1000) NOT NULL,
    [endpoint] NVARCHAR(800) NOT NULL,
    [p256dh] NVARCHAR(1000) NOT NULL,
    [auth] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL,
    CONSTRAINT [PushDevice_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PushDevice_endpoint_key] UNIQUE NONCLUSTERED ([endpoint])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PushDevice_userId_idx] ON [dbo].[PushDevice]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PushDevice_sessionId_idx] ON [dbo].[PushDevice]([sessionId]);

-- AddForeignKey
ALTER TABLE [dbo].[PushDevice] ADD CONSTRAINT [PushDevice_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PushDevice] ADD CONSTRAINT [PushDevice_sessionId_fkey] FOREIGN KEY ([sessionId]) REFERENCES [dbo].[session]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

