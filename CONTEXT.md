# AVEXIM Communication

An internal communication platform where AVEXIM staff post work items into business areas and discuss them.

## Language

### Organising work

**Task**:
A work item a user posts into a Category, with a title, description, attachments and a done/not-done status.

**Category**:
A business area that Tasks are posted into, such as Golf Clubs, Bars, Events or Warehouse.

**Category Group**:
A navigation heading that bundles related Categories; it holds no Tasks of its own. Venues (Обекти) is the only one today.
_Avoid_: calling Venues a Category

**Task Owner**:
The user who posted a Task; the only one who may edit or delete it, or pin its Comments.
_Avoid_: creator, author (reserve "author" for Comments)

**Done**:
A Task's finished status. Any user, not only the Task Owner, may mark a Task done or not done.
_Avoid_: completed, closed

### Discussion

**Comment**:
A message a user posts on a Task. Its writer is the Comment's author.

**Reply**:
A Comment posted under a top-level Comment, answering one specific Comment in that thread: either the top-level Comment or another Reply. Threads are one level deep: replying to a Reply files the new Reply under the same top-level Comment, but it still answers that Reply.

**Reaction**:
An emoji a user attaches to a Comment; one user may add several different emojis to the same Comment.
_Avoid_: like

**Pinned Comment**:
The single top-level Comment the Task Owner has chosen to show first on a Task.

### Activity and notifications

**Activity**:
A lasting record that something happened: a Task was created, edited, deleted or marked done or not done, or a Comment or Reply was posted. Reactions are not Activities. An Activity outlives the Task it describes, but disappears with a deleted Comment.
_Avoid_: event, log entry

**Activity Feed**:
The newest-first list of all Activities. It is the same for every user.
_Avoid_: timeline, inbox

**Unread**:
An Activity someone else caused that the user hasn't seen yet: it happened after they last opened the Activity Feed and after they last opened its Task. The count of Unread Activities is the app icon's badge.

**Actor**:
The user whose action caused a Notification. An Actor is never notified about their own action.

**Push device**:
A browser where a user turned notifications on while signed in. Their Notifications go there by push instead of by email. Signing out of that browser, or the push service refusing it, removes it.

**Notification**:
A message telling a user about an Activity, or a Reaction to their Comment, that someone else caused. Each person receives it by push on any device where they've turned notifications on, or by email if they have no such device.
_Avoid_: alert

### People

**Profile picture**:
A photo a user chooses to show beside their name, trimmed to a square. Without one, their initials stand in. Only the user can set or remove it.
_Avoid_: avatar (the circle that shows either the picture or the initials)
