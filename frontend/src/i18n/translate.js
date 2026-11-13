import { bn } from './bn.js'

export function translate(value, language = 'en') {
  if (language !== 'bn' || typeof value !== 'string') return value
  const key = value.trim()
  if (!key) return value
  let translated = bn[key] ?? ({ssc: 'এসএসসি', hsc: 'এইচএসসি', admission: 'ভর্তি পরীক্ষা', ADMISSION: 'ভর্তি পরীক্ষা', day: 'দিন', hr: 'ঘণ্টা', sec: 'সেকেন্ড'})[key]
  if (translated === undefined) {
    const patterns = [
      [/^(\d+) contests? completed$/, ([, n]) => `${n}টি প্রতিযোগিতা সম্পন্ন`],
      [/^Option (\d+)$/, ([, n]) => `বিকল্প ${n}`],
      [/^(\d+) min$/, ([, n]) => `${n} মিনিট`],
      [/^(\d+) MCQ$/, ([, n]) => `${n}টি বহুনির্বাচনি প্রশ্ন`],
      [/^(.+)'s profile$/, ([, name]) => `${name}-এর প্রোফাইল`],
      [/^৳([\d,.]+) available$/, ([, n]) => `৳${n} ব্যালেন্স`],
      [/^(\d+) days?$/, ([, n]) => `${n} দিন`],
      [/^(\d+) quizzes? available$/, ([, n]) => `${n}টি কুইজ আছে`],
      [/^(\d+) quizzes? completed$/, ([, n]) => `${n}টি কুইজ সম্পন্ন`],
      [/^Skill rating ([\d,]+)$/, ([, n]) => `দক্ষতার রেটিং ${n}`],
      [/^(\d+) rating points to (Newbie|Pupil|Specialist|Expert)$/, ([, n, level]) => `${bn[level]} হতে আরও ${n} রেটিং পয়েন্ট`],
      [/^Question (\d+)$/, ([, n]) => `প্রশ্ন ${n}`],
      [/^Answer (\d+)$/, ([, n]) => `উত্তর ${n}`],
      [/^Question (\d+) (text|difficulty|answer \d+|correct answer \d+)$/, ([, n, field]) => `প্রশ্ন ${n}: ${field === 'text' ? 'প্রশ্নের লেখা' : field === 'difficulty' ? 'কঠিনতার মাত্রা' : field.replace('correct answer', 'সঠিক উত্তর').replace('answer', 'উত্তর')}`],
      [/^Remove question (\d+)$/, ([, n]) => `প্রশ্ন ${n} সরান`],
      [/^(Edit|Delete) (.+)$/, ([, action, title]) => `${action === 'Edit' ? 'সম্পাদনা' : 'মুছুন'}: ${title}`],
      [/^Class (\d+)$/, ([, n]) => `শ্রেণি ${n}`],
      [/^class (\d+)$/i, ([, n]) => `শ্রেণি ${n}`],
      [/^(.+) Board$/, ([, board]) => `${bn[board] || board} বোর্ড`],
      [/^([+-]?\d+(?:\.\d+)?) percentage points$/, ([, n]) => `${n} শতাংশ পয়েন্ট`],
      [/^([+-]?\d+(?:\.\d+)?) rating today$/, ([, n]) => `${n} আজকের রেটিং`],
    ]
    for (const [pattern, format] of patterns) {
      const match = key.match(pattern)
      if (match) { translated = format(match); break }
    }
  }
  return translated === undefined ? value : `${value.match(/^\s*/)[0]}${translated}${value.match(/\s*$/)[0]}`
}
