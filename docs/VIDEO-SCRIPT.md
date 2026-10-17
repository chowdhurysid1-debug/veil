# Veil: 2-minute video script

For Sid and Anshul, recording the SEP Hacks submission. The limit is 2:00, on YouTube or Loom.

The deck version is https://veil-iota-ten.vercel.app/pitch?cut=video. Press **N** for these same lines, **T** for the timer, and **F** for full screen.

## Before you hit record

1. **Clean the database** in the Supabase SQL Editor, so the hug isn't already learned:
   ```sql
   delete from public.feedback where id::text not like '5eed%';
   ```
   Then check that https://veil-iota-ten.vercel.app/learning shows **20** human labels.
2. **Open three tabs, in this order:**
   1. https://veil-iota-ten.vercel.app/pitch?cut=video (full screen with **F**)
   2. https://veil-iota-ten.vercel.app/clips/025aa602-b2d2-486e-949d-f0defef37ea8 (passing period, preloaded)
   3. https://veil-iota-ten.vercel.app/clips/new (for the live courtyard hug upload)

   Keep these two links ready to paste:
   - Gym hug: https://veil-iota-ten.vercel.app/clips/1560400e-0e24-4af5-a936-999f15c06d39
   - Collar grab: https://veil-iota-ten.vercel.app/clips/fb6cf89d-67f0-4696-9418-b85ea868710a

3. **Turn on Do Not Disturb.** Close Slack, Messages, and anything that pops up.
4. **Set up Loom** with screen and camera bubble at 1080p. Test the mic for 5 seconds and play it back.
5. **Keep the browser tab in front** during the upload. Background tabs process clips about 15 times slower.

## The script

About 300 spoken words. Speak at a normal pace; don't rush.

| Time | Who    | On screen                                                     | Say                                                                                                                                                                                                                                             |
| ---- | ------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00 | Sid    | Deck: hook (hallway video)                                    | 93% of US public schools run security cameras. Every one of them stores every student's face.                                                                                                                                                   |
| 0:06 | Sid    | Deck: problem (breach dots)                                   | Stored faces leak. Hackers broke into 150,000 Verkada cameras, inside schools. Meta paid Texas 1.4 billion dollars over face data.                                                                                                              |
| 0:16 | Sid    | Deck: why now                                                 | Regulators are banning face databases. And vision AI can now spot a fight without ever seeing a face.                                                                                                                                           |
| 0:24 | Sid    | Deck: solution. Drag the slider while talking                 | So we built Veil: security cameras that forget faces. Every head is blurred and encrypted in the browser, before footage leaves the building.                                                                                                   |
| 0:33 | Anshul | App: passing period clip                                      | Here's a hallway between classes. Every face blurred and locked. Nothing flagged.                                                                                                                                                               |
| 0:40 | Anshul | App: gym hug clip                                             | Two students grab each other. Faces are blurred, so the AI can't read expressions. It flags a possible fight.                                                                                                                                   |
| 0:48 | Anshul | Click **False alarm**. The learning panel moves               | The officer knows it was a hug, and marks it a false alarm. Watch the panel: the fight threshold rises, at every site.                                                                                                                          |
| 0:57 | Anshul | /clips/new: click the **Another hug** sample. Pipeline runs | Another hug, at a different camera. While it uploads, every face is blurred and encrypted right on this laptop. _(wait for the result)_ Not flagged. It learned.                                                                                |
| 1:17 | Anshul | App: collar grab clip                                         | But a student pinned to a wall? Still flagged. Learning didn't hide a real fight.                                                                                                                                                               |
| 1:25 | Anshul | Deck: under the hood                                          | Under the hood: MediaPipe finds every head in the browser. Claude Sonnet 5.5, through the Vercel AI SDK, sees only blurred frames and returns typed events. Every officer label tunes the thresholds and becomes an example Claude learns from. |
| 1:39 | Sid    | Deck: measured learning curve                                 | We measured it on the real model. One school drops from 5 false alarms to 1 in four weeks, and still catches 8 of 8 real incidents. A school that never labeled anything, taught only by a store, improves just as much.                        |
| 1:52 | Both   | Deck: the ask                                                 | **Sid:** We're Sid. **Anshul:** And Anshul. **Sid:** We built Veil at this hackathon with Next.js, Supabase and Claude. **Both:** Veil. Cameras that forget faces.                                                                              |

## If something goes wrong

- **The upload takes longer than 20 seconds:** keep talking about what the pipeline screen shows (faces found, blurred, encrypted). Then trim the dead air in Loom's editor.
- **The courtyard hug gets flagged anyway:** say "it's less sure now" if the confidence dropped, and keep going. Afterwards, check that the database cleanup ran before recording.
- **You go over 2:00:** cut the why-now line first, then shorten the AI line to its first sentence.
- **You need a second take:** rerun the database cleanup first. The first take already taught it the hug.

## After recording

1. Upload to YouTube (unlisted) or Loom, and open the link in a private window to check it plays.
2. Send the link to Claude to add to the README.
3. Submit on Devpost before 2:00 PM: the GitHub repo, https://veil-iota-ten.vercel.app, the video, and both team members.
