import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shelter Finder - מחיקת נתונים</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;line-height:1.8;color:#333}h1{color:#1a1a1a}h2{color:#444;margin-top:20px}.box{background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0}</style></head>
<body>
<h1>מחיקת נתונים - Shelter Finder</h1>

<h2>כיצד למחוק את הנתונים שלך</h2>
<p>Shelter Finder אוספת מינימום נתונים ואינה שומרת מידע אישי מזהה. כך תוכלו למחוק את הנתונים:</p>

<div class="box">
<h3>שלב 1: הסרת התקנה</h3>
<p>מחקו את האפליקציה מהמכשיר. פעולה זו מסירה את כל הנתונים המקומיים כולל הגדרות, ערים נבחרות ומטמון.</p>

<h3>שלב 2: מחיקת נתוני שרת</h3>
<p>לאחר הסרת ההתקנה, טוקן ההתראות שלכם מתבטל אוטומטית ומוסר מהשרתים שלנו. נתוני הגעה למקלט הם אנונימיים לחלוטין ואינם ניתנים לשיוך למשתמש ספציפי.</p>

<h3>שלב 3: בקשה ידנית (אופציונלי)</h3>
<p>לבקשת מחיקה ידנית, שלחו דוא"ל ל: <a href="mailto:zhekakosuha@gmail.com">zhekakosuha@gmail.com</a></p>
</div>

<h2>אילו נתונים נמחקים</h2>
<ul>
<li><strong>טוקן התראות</strong> — מוסר אוטומטית לאחר הסרת ההתקנה</li>
<li><strong>ערים נבחרות</strong> — מוסרות יחד עם הטוקן</li>
<li><strong>הגדרות</strong> — נמחקות עם הסרת האפליקציה</li>
</ul>

<h2>נתונים שאינם ניתנים למחיקה ספציפית</h2>
<p>נתוני הגעה למקלט הם אנונימיים לחלוטין — אין דרך לזהות או לשייך אותם למשתמש ספציפי, ולכן אינם דורשים מחיקה.</p>

<hr>
<p style="color:#888;font-size:14px">Shelter Finder • <a href="/privacy-policy.html">מדיניות פרטיות</a> • zhekakosuha@gmail.com</p>
</body></html>`)
}
