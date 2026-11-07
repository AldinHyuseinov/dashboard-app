import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { createNotifications } from "@/lib/notifications";
import { createUser } from "./support/fixtures";

describe("Notifications by email", () => {
  let emails: InMemoryEmailAdapter;
  let notifications: ReturnType<typeof createNotifications>;

  beforeEach(() => {
    emails = new InMemoryEmailAdapter();
    notifications = createNotifications({ emailAdapter: emails });
  });

  it("when Ivan creates a Task, everyone else is emailed with the Category's label, but not Ivan", async () => {
    const ivan = await createUser("Ivan");
    await createUser("Maria");
    await createUser("Georgi");

    await notifications.notifyTaskChange({
      actorId: ivan.id,
      action: "Създадена",
      category: "golf-clubs",
    });

    expect(emails.sent).toHaveLength(1);
    expect(emails.sent[0].to.toSorted()).toEqual(["georgi@avexim.test", "maria@avexim.test"]);
    expect(emails.sent[0].html).toContain("Създадена задача в категория: Голф Клубове");
  });

  it("when Maria comments, the email names the Task and its Category's label", async () => {
    await createUser("Ivan");
    const maria = await createUser("Maria");

    await notifications.notifyComment({
      actorId: maria.id,
      actorName: maria.name,
      taskTitle: "Нова винена листа",
      category: "warehouse",
      type: "comment",
    });

    expect(emails.sent).toHaveLength(1);
    expect(emails.sent[0].to).toEqual(["ivan@avexim.test"]);
    expect(emails.sent[0].subject).toBe("Нов коментар: Нова винена листа");
    expect(emails.sent[0].html).toContain("Склад");
  });

  it("sends nothing when the Actor is the only staff member", async () => {
    const ivan = await createUser("Ivan");

    await notifications.notifyTaskChange({
      actorId: ivan.id,
      action: "Изтрита",
      category: "bars",
    });

    expect(emails.sent).toEqual([]);
  });
});
