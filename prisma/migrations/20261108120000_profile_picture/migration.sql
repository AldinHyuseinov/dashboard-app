BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ProfilePicture] (
    [userId] NVARCHAR(1000) NOT NULL,
    [data] VARBINARY(max) NOT NULL,
    [setAt] DATETIME2 NOT NULL,
    CONSTRAINT [ProfilePicture_pkey] PRIMARY KEY CLUSTERED ([userId])
);

-- AddForeignKey
ALTER TABLE [dbo].[ProfilePicture] ADD CONSTRAINT [ProfilePicture_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[user]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
