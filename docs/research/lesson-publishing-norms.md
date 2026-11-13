# How do course platforms publish new lessons and tell enrolled students?

Research for [#22](https://github.com/carlos-hm/cohort-005-project/issues/22), feeding [#23](https://github.com/carlos-hm/cohort-005-project/issues/23) ("What triggers the New lesson Notification?"). Researched 2026-11-13 against the platforms' official help centres.

## Short answer

- **Most platforms give lessons their own Draft/Published state, separate from the course.** Teachable, Thinkific, Kajabi and Circle all do, and new lessons start as Draft on Teachable and Circle. Podia is the exception: once a course is live, lessons you add go live straight away.
- **No platform found sends an automatic "new lesson" notification when a lesson is published.** New content is announced on purpose, by the instructor, through a course announcement or broadcast (Kajabi, Udemy, Podia, Maven, Thinkific's guidance).
- **The only automatic "new content" emails are tied to drip schedules,** and they are per section or module, not per lesson. Instructors opt in to them (Teachable, Kajabi, Circle). Podia sends them automatically.
- **Batching and throttling are coarse when they exist.** Udemy caps educational announcements at 4 per course per month. Teachable sends drip emails at a fixed time, 15 hours after release. Thinkific's fallback is one weekly digest per student. Maven batches calendar invites, about 1 email per 6 events.
- **Opt-out is per course or announcement, not per lesson.** Kajabi makes the email optional on each announcement. Udemy and Kajabi let students unsubscribe from a course's announcements. Circle and Teachable let the instructor turn drip email on or off for each section.

## Per platform

### Teachable

- **Lesson publish state: yes.** "By default, new lessons are unpublished." You can publish or unpublish all of a section's lessons at once. A section with only unpublished lessons is hidden. Course publish and visibility settings are separate, on the Information tab. ([Sections and Lessons](https://support.teachable.com/en/articles/11682453-sections-and-lessons))
- **Notify on publish: not documented.** The lessons article doesn't mention notifying students when a lesson is published.
- **Drip email: opt-in, per section, delayed.** "School owners have the option to set up automatic email notifications." You compose them in the section's Drip panel, under "Notify your students". They must be activated at least 48 hours before the drip date. They go out "15 hours after the section drips", at 15:00 UTC. They stop for students who are granted full access. ([Drip Content](https://support.teachable.com/en/articles/11682465-drip-content))

### Thinkific

Note: support.thinkific.com refuses automated fetches. The claims below come from search-engine excerpts of Thinkific's official articles, not a direct read.

- **Lesson publish state: yes, as a per-lesson "Draft" checkbox.** Draft content stays hidden from enrolled students "even if your course is published", until the setting is removed. A chapter can be set so that new lessons are drafts by default. Moving a published lesson back to draft removes students' access. The new course builder calls this "hidden". ([Creating Draft Content for Your Course](https://support.thinkific.com/hc/en-us/articles/360030740533-Creating-Draft-Content-for-Your-Course), [Lesson Settings](https://support.thinkific.com/hc/en-us/articles/360038694193-Lesson-Settings), [New Course Builder](https://support.thinkific.com/hc/en-us/articles/37783573725463-How-to-Add-Content-and-Configure-Your-Course-in-the-New-Course-Builder))
- **Notify on publish: no.** The draft article recommends that you "inform students once new content is ready", which is a manual step.
- **Drip email: not automatic.** Instead, Thinkific points to **Weekly Reminder Emails**. This is a site-wide digest, one email per student each Sunday, listing their incomplete courses. It can't be customised per course, and students can turn it off. ([How are students notified when new Drip Content is released?](https://support.thinkific.com/hc/en-us/articles/360030737153-How-are-students-notified-when-new-Drip-Content-is-released), [Weekly Reminder Emails](https://support.thinkific.com/hc/en-us/articles/360030717833-Weekly-Reminder-Emails))

### Kajabi

- **Lesson publish state: yes.** "Draft: Hidden from customers" / "Published: Visible to customers." You can't drip individual lessons, only modules. ([Create a lesson](https://help.kajabi.com/articles/products/courses/create-a-lesson))
- **Notify on publish: no. It's a deliberate Announcement.** The instructor posts an Announcement on the course "to convey information about new modules or lessons". They can "optionally, elect to Send an email notification". Emails "are immediately sent after the Announcement is added". Mobile-app users also get a push notification. Students who unsubscribed from Product Announcements get no email. ([Send a product announcement](https://help.kajabi.com/articles/products/courses/send-a-product-announcement))
- **Drip email: a site-level opt-in.** The setting is Settings > Drip settings, "send an email to customers when product modules are dripped", using the "Member Drip Notification" template. ([Schedule and drip content in Courses](https://help.kajabi.com/en/articles/12695113-schedule-and-drip-content-in-courses))
- Kajabi also lists "advertising the release of a Course Lesson" as a use for manual push notifications in its Branded App. ([Create branded app push notifications](https://help.kajabi.com/en/articles/17175495-create-branded-app-push-notifications))

### Podia

- **Lesson publish state: no, for live courses.** Content you add or edit after publishing is "automatically saved and immediately live". You publish only once, at the product level. ([Publishing your product](https://help.podia.com/en/articles/11370837-publishing-your-product))
- **Notify on publish: no.** You'd send a broadcast email by hand, choosing the audience and sending now or scheduling it. ([Creating & sending email newsletters](https://help.podia.com/en/articles/11371063-creating-sending-email-newsletters))
- **Drip email: automatic.** "When a new section unlocks, your customers will automatically receive an email notification with a link to the section." ([Drip course content](https://www.podia.com/articles/drip-course-content))

### Udemy

Note: support.udemy.com and teach.udemy.com refuse automated fetches. The claims below come from search-engine excerpts of Udemy's official help pages.

- **Lesson publish state: yes.** Lectures are published individually, and enrolled students see a newly published lecture right away. This comes from Udemy community moderators, not the help centre.
- **Notify on publish: no. It's a deliberate educational announcement.** Udemy's guidance: "when you update your course, it's a good idea to make an Educational Announcement to let your learners know what's new." Announcements are emailed to learners and also posted in the course's Announcements section. ([Send Promotional Emails and Educational Announcements](https://support.udemy.com/hc/en-us/articles/229605788-Send-Promotional-Emails-and-Educational-Announcements), [How course maintenance can boost your performance](https://teach.udemy.com/publishing/maintain-your-course/))
- **Throttle:** "Instructors may send only four educational announcements per course per month." ([Educational announcements: Rules and guidelines](https://support.udemy.com/hc/en-us/articles/229605828-Educational-announcements-Rules-and-guidelines))
- **Student opt-out is per course.** Students can turn off "new announcement emails" from a course's overview page. The help text notes that "many instructors send announcements regarding new lectures". ([New Course Experience FAQ](https://support.udemy.com/hc/en-us/articles/34345830524183-Udemy-s-New-Course-Experience-Frequently-Asked-Questions))

### Circle

- **Lesson publish state: yes.** "When you create a lesson, it's automatically set to Draft." Only admins and moderators can see drafts. Publishing a lesson makes it visible to members, and the docs don't mention a notification. ([Configure lesson settings](https://help.circle.so/p/courses/course-setup/configure-lesson-settings))
- **Drip notifications: opt-in, per section, multi-channel.** The instructor can "send email, in-app, and push notifications to let students know when a new section becomes available." Email is a toggle on each section. If it was off when a section dripped, turning it on afterwards still notifies students. Students can turn off "New course content" notifications in their own preferences. ([Utilizing the drip feature](https://help.circle.so/p/courses/course-setup/utilizing-the-drip-feature-for-structured-and-scheduled-courses))

### Maven (cohort-based, for contrast)

- No help article describes a lesson-publish notification. Instructors email students on purpose, from the course's Emails/Broadcasts tab. ([Send an email to students](https://help.maven.com/en/articles/5597077-send-an-email-to-students))
- Automatic emails are tied to events and deadlines, not to publishing. Saving calendar events sends nothing. Publishing the calendar sends "1 email for every 6 calendar events", which is batching. Students who haven't finished a lesson get a reminder the day before its due date. ([Your course events](https://help.maven.com/en/articles/5597433-your-course-events), [Student notifications](https://help.maven.com/en/articles/8887252-student-notifications))

## Summary table

| Platform  | Lesson Draft/Published separate from course | Auto-notify on lesson publish | Deliberate "tell students" action         | Automatic content email        | Throttle / batching                     |
| --------- | ------------------------------------------- | ----------------------------- | ----------------------------------------- | ------------------------------ | --------------------------------------- |
| Teachable | Yes (default unpublished)                   | Not documented                | Email users                               | Drip, opt-in, per section      | Sent 15 h after drip, at a fixed time   |
| Thinkific | Yes (Draft checkbox, chapter default)       | No                            | Recommended manually                      | None. Weekly digest instead    | Weekly digest                           |
| Kajabi    | Yes                                         | No                            | Announcement (email optional, plus push)  | Drip, site-level opt-in        | None                                    |
| Podia     | No (live immediately)                       | No                            | Broadcast email                           | Drip, automatic                | None                                    |
| Udemy     | Yes (per lecture)                         | No                            | Educational announcement                  | None                           | 4 announcements per course per month    |
| Circle    | Yes (default Draft)                         | No                            | n/a (posts in community)                  | Drip, opt-in per section       | None                                    |
| Maven     | n/a (cohort syllabus)                       | No                            | Broadcast email                           | Due-date reminders, calendar   | 1 email per 6 calendar events           |

## What this means for Cadence

Today, Cadence lessons have no publish state, and every lesson added to a published course is visible immediately. That is the **Podia** model, which is the outlier among the platforms above.

- **Option (a), a lesson publish state with Notification on publish.** The first half is the prevailing standard: Teachable, Thinkific, Kajabi, Circle and Udemy all have a per-lesson Draft/Published state, usually defaulting to Draft. The second half is not: none of these platforms fires a notification just because a lesson is published. Publish state is used to hide unfinished work, not as a signal to notify.
- **Option (b), an instructor "Notify enrolled Students" action.** This matches how platforms actually announce new content: Kajabi's Announcement with its optional email, Udemy's educational announcement, Podia and Maven broadcasts, and Thinkific's "inform students" guidance. The instructor decides when to tell students and what to say, and can group several lessons into one message. Udemy throttles this action (4 per course per month).
- **Automatic notifications show up only with drip schedules,** and they work at section or module level, usually opt-in, sometimes delayed (Teachable) or rolled into a digest (Thinkific). Cadence has no drip schedule, so this pattern doesn't apply directly. It shows that where platforms do notify automatically, it is about a group of lessons, the instructor can switch it off, and students can opt out.
- The two options can be combined. The common platform setup is a publish state to hide unfinished work plus a separate deliberate announcement. Choosing (a) doesn't commit Cadence to notifying on publish.
