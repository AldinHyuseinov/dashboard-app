BEGIN TRY

BEGIN TRAN;

-- Every existing user has seen the Feed as of now, so the Activities
-- backfilled from existing data start as read. Times are stored in UTC.
-- A separate migration from the column it fills: SQL Server compiles a batch
-- before running it, so it can't use a column added in the same batch.

UPDATE [dbo].[user] SET [lastFeedVisitAt] = SYSUTCDATETIME();

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
