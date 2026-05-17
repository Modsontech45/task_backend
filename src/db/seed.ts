import { pool } from './index';

type T = { d:number; cat:string; title:string; s:string; e:string; fixed:boolean; ord:number };

// day_of_week: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
// Active window: 06:00 – 22:30 every day
const templates: T[] = [

  // ── MONDAY (no school — deep work & recovery) ─────────────────────────────
  { d:1, cat:'personal',  title:'Wake up, hygiene, breakfast',              s:'06:00', e:'06:30', fixed:false, ord:1  },
  { d:1, cat:'skill',     title:'Skill Learning (deep session)',             s:'06:30', e:'08:00', fixed:false, ord:2  },
  { d:1, cat:'reading',   title:'Reading',                                   s:'08:00', e:'09:00', fixed:false, ord:3  },
  { d:1, cat:'bilingual', title:'Bilingual Training (speaking practice)',    s:'09:00', e:'10:00', fixed:false, ord:4  },
  { d:1, cat:'reading',   title:'Lesson Review (catch-up / prep for week)', s:'10:00', e:'12:00', fixed:false, ord:5  },
  { d:1, cat:'personal',  title:'Déjeuner & repos',                          s:'12:00', e:'13:00', fixed:false, ord:6  },
  { d:1, cat:'personal',  title:"Visit brother's construction site",         s:'13:00', e:'14:00', fixed:false, ord:7  },
  { d:1, cat:'personal',  title:'Projets personnels / errands',              s:'14:00', e:'16:00', fixed:false, ord:8  },
  { d:1, cat:'personal',  title:'Talk to girlfriend',                        s:'16:00', e:'16:10', fixed:false, ord:9  },
  { d:1, cat:'skill',     title:'Skill Learning (session 2)',                s:'16:30', e:'18:00', fixed:false, ord:10 },
  { d:1, cat:'gym',       title:'Gym',                                        s:'18:30', e:'20:00', fixed:false, ord:11 },
  { d:1, cat:'bilingual', title:'Bilingual Training (writing / listening)',  s:'20:30', e:'21:30', fixed:false, ord:12 },
  { d:1, cat:'reading',   title:'Reading',                                   s:'21:30', e:'22:00', fixed:false, ord:13 },
  { d:1, cat:'personal',  title:'Préparer demain / se détendre',             s:'22:00', e:'22:30', fixed:false, ord:14 },

  // ── TUESDAY (school 10:00–17:30) ──────────────────────────────────────────
  { d:2, cat:'personal',  title:'Wake up, hygiene',                          s:'06:00', e:'06:30', fixed:false, ord:1  },
  { d:2, cat:'bilingual', title:'Bilingual Training (podcast/audio)',        s:'06:30', e:'07:00', fixed:false, ord:2  },
  { d:2, cat:'skill',     title:'Skill Learning (morning session)',          s:'07:00', e:'08:00', fixed:false, ord:3  },
  { d:2, cat:'personal',  title:'Breakfast',                                 s:'08:00', e:'08:30', fixed:false, ord:4  },
  { d:2, cat:'travel',    title:'Travel to school',                          s:'09:00', e:'09:30', fixed:false, ord:5  },
  { d:2, cat:'school',    title:'IT 240 – Intro aux BDD (UML/SQL) — M. EDOU',                               s:'10:00', e:'12:00', fixed:true,  ord:6  },
  { d:2, cat:'personal',  title:'Pause déjeuner',                            s:'12:00', e:'13:00', fixed:false, ord:7  },
  { d:2, cat:'school',    title:'IT 223 – Probabilités & Stats Descriptives — M. AVEYA Prenam',             s:'13:00', e:'15:00', fixed:true,  ord:8  },
  { d:2, cat:'personal',  title:'Pause',                                     s:'15:00', e:'15:30', fixed:false, ord:9  },
  { d:2, cat:'school',    title:'MGT 103 – Droit (général, travail, propriété intellectuelle) — M. Agba KOFFI', s:'15:30', e:'17:30', fixed:true, ord:10 },
  { d:2, cat:'travel',    title:'Travel home',                               s:'17:30', e:'18:00', fixed:false, ord:11 },
  { d:2, cat:'personal',  title:'Talk to girlfriend',                        s:'18:00', e:'18:10', fixed:false, ord:12 },
  { d:2, cat:'gym',       title:'Gym',                                        s:'19:00', e:'20:00', fixed:false, ord:13 },
  { d:2, cat:'reading',   title:'Lesson Review',                             s:'20:00', e:'21:00', fixed:false, ord:14 },
  { d:2, cat:'skill',     title:'Skill Learning',                            s:'21:00', e:'21:30', fixed:false, ord:15 },
  { d:2, cat:'reading',   title:'Reading',                                   s:'21:30', e:'22:00', fixed:false, ord:16 },
  { d:2, cat:'personal',  title:'Se détendre / préparer demain',             s:'22:00', e:'22:30', fixed:false, ord:17 },

  // ── WEDNESDAY (school 07:30–12:00) ────────────────────────────────────────
  { d:3, cat:'personal',  title:'Wake up, hygiene',                          s:'06:00', e:'06:30', fixed:false, ord:1  },
  { d:3, cat:'personal',  title:'Breakfast',                                 s:'06:30', e:'07:00', fixed:false, ord:2  },
  { d:3, cat:'travel',    title:'Travel to school',                          s:'07:00', e:'07:30', fixed:false, ord:3  },
  { d:3, cat:'school',    title:'MGT 110 – Anglais Technique II — M. KONLAN',                               s:'07:30', e:'09:30', fixed:true,  ord:4  },
  { d:3, cat:'personal',  title:'Pause',                                     s:'09:30', e:'10:00', fixed:false, ord:5  },
  { d:3, cat:'school',    title:'MGT 102 – Économie & Gestion — M. ATITEY KOKOUTSE',                       s:'10:00', e:'12:00', fixed:true,  ord:6  },
  { d:3, cat:'travel',    title:'Travel home',                               s:'12:00', e:'12:30', fixed:false, ord:7  },
  { d:3, cat:'personal',  title:'Déjeuner & repos',                          s:'12:30', e:'13:30', fixed:false, ord:8  },
  { d:3, cat:'skill',     title:'Skill Learning',                            s:'13:30', e:'15:00', fixed:false, ord:9  },
  { d:3, cat:'personal',  title:"Visit brother's construction site",         s:'15:00', e:'16:00', fixed:false, ord:10 },
  { d:3, cat:'bilingual', title:'Bilingual Training',                        s:'16:00', e:'17:00', fixed:false, ord:11 },
  { d:3, cat:'reading',   title:'Lesson Review',                             s:'17:00', e:'18:00', fixed:false, ord:12 },
  { d:3, cat:'personal',  title:'Talk to girlfriend',                        s:'18:00', e:'18:10', fixed:false, ord:13 },
  { d:3, cat:'gym',       title:'Gym',                                        s:'18:30', e:'19:30', fixed:false, ord:14 },
  { d:3, cat:'reading',   title:'Reading',                                   s:'20:00', e:'21:00', fixed:false, ord:15 },
  { d:3, cat:'skill',     title:'Skill Learning (session 2)',                s:'21:00', e:'22:00', fixed:false, ord:16 },
  { d:3, cat:'personal',  title:'Se détendre',                               s:'22:00', e:'22:30', fixed:false, ord:17 },

  // ── THURSDAY (school 07:30–12:00) ─────────────────────────────────────────
  { d:4, cat:'personal',  title:'Wake up, hygiene',                          s:'06:00', e:'06:30', fixed:false, ord:1  },
  { d:4, cat:'personal',  title:'Breakfast',                                 s:'06:30', e:'07:00', fixed:false, ord:2  },
  { d:4, cat:'travel',    title:'Travel to school',                          s:'07:00', e:'07:30', fixed:false, ord:3  },
  { d:4, cat:'school',    title:'IT 240 – Intro aux BDD (UML/SQL) — M. EDOU',                               s:'07:30', e:'09:30', fixed:true,  ord:4  },
  { d:4, cat:'personal',  title:'Pause',                                     s:'09:30', e:'10:00', fixed:false, ord:5  },
  { d:4, cat:'school',    title:'CSC 242 – Algorithmes & Programmation Python II — M. Shaban ABDOULATIF',   s:'10:00', e:'12:00', fixed:true,  ord:6  },
  { d:4, cat:'travel',    title:'Travel home',                               s:'12:00', e:'12:30', fixed:false, ord:7  },
  { d:4, cat:'personal',  title:'Déjeuner & repos',                          s:'12:30', e:'13:30', fixed:false, ord:8  },
  { d:4, cat:'bilingual', title:'Bilingual Training (speaking / shadowing)', s:'13:30', e:'15:00', fixed:false, ord:9  },
  { d:4, cat:'skill',     title:'Skill Learning',                            s:'15:00', e:'16:30', fixed:false, ord:10 },
  { d:4, cat:'reading',   title:'Lesson Review',                             s:'16:30', e:'17:30', fixed:false, ord:11 },
  { d:4, cat:'reading',   title:'Reading',                                   s:'17:30', e:'18:30', fixed:false, ord:12 },
  { d:4, cat:'personal',  title:'Talk to girlfriend',                        s:'18:30', e:'18:40', fixed:false, ord:13 },
  { d:4, cat:'gym',       title:'Gym',                                        s:'19:00', e:'20:00', fixed:false, ord:14 },
  { d:4, cat:'bilingual', title:'Bilingual Training (listening / writing)',  s:'20:30', e:'21:30', fixed:false, ord:15 },
  { d:4, cat:'personal',  title:'Se détendre / temps libre',                 s:'21:30', e:'22:30', fixed:false, ord:16 },

  // ── FRIDAY (school 07:30–15:00) ───────────────────────────────────────────
  { d:5, cat:'personal',  title:'Wake up, hygiene',                          s:'06:00', e:'06:30', fixed:false, ord:1  },
  { d:5, cat:'personal',  title:'Breakfast',                                 s:'06:30', e:'07:00', fixed:false, ord:2  },
  { d:5, cat:'travel',    title:'Travel to school',                          s:'07:00', e:'07:30', fixed:false, ord:3  },
  { d:5, cat:'school',    title:'NET 363 – Interconnexion des Réseaux (CCNA PART II) — M. Tote AHOUNDA',   s:'07:30', e:'09:30', fixed:true,  ord:4  },
  { d:5, cat:'personal',  title:'Pause',                                     s:'09:30', e:'10:00', fixed:false, ord:5  },
  { d:5, cat:'school',    title:'NET 303 – Maintenance des Postes de Travail II — M. ADAMOU Atiabou',      s:'10:00', e:'12:00', fixed:true,  ord:6  },
  { d:5, cat:'personal',  title:'Déjeuner (pause)',                          s:'12:00', e:'13:00', fixed:false, ord:7  },
  { d:5, cat:'school',    title:'MAT 141 – Logique & Mathématiques Discrètes II — Dr PINDRA',              s:'13:00', e:'15:00', fixed:true,  ord:8  },
  { d:5, cat:'travel',    title:'Travel home',                               s:'15:00', e:'15:30', fixed:false, ord:9  },
  { d:5, cat:'personal',  title:'Repos & snack',                             s:'15:30', e:'16:00', fixed:false, ord:10 },
  { d:5, cat:'personal',  title:"Visit brother's construction site",         s:'16:00', e:'17:00', fixed:false, ord:11 },
  { d:5, cat:'reading',   title:'Lesson Review',                             s:'17:00', e:'18:00', fixed:false, ord:12 },
  { d:5, cat:'personal',  title:'Talk to girlfriend',                        s:'18:00', e:'18:10', fixed:false, ord:13 },
  { d:5, cat:'gym',       title:'Gym',                                        s:'19:00', e:'20:00', fixed:false, ord:14 },
  { d:5, cat:'bilingual', title:'Bilingual Training',                        s:'20:00', e:'21:00', fixed:false, ord:15 },
  { d:5, cat:'skill',     title:'Skill Learning',                            s:'21:00', e:'21:30', fixed:false, ord:16 },
  { d:5, cat:'personal',  title:'Se détendre / temps libre',                 s:'21:30', e:'22:30', fixed:false, ord:17 },

  // ── SATURDAY (school 07:30–12:00) ─────────────────────────────────────────
  { d:6, cat:'personal',  title:'Wake up, hygiene',                          s:'06:00', e:'06:30', fixed:false, ord:1  },
  { d:6, cat:'personal',  title:'Breakfast',                                 s:'06:30', e:'07:00', fixed:false, ord:2  },
  { d:6, cat:'travel',    title:'Travel to school',                          s:'07:00', e:'07:30', fixed:false, ord:3  },
  { d:6, cat:'school',    title:'IT 223 – Probabilités & Stats Descriptives — M. AVEYA Prenam',            s:'07:30', e:'09:30', fixed:true,  ord:4  },
  { d:6, cat:'personal',  title:'Pause',                                     s:'09:30', e:'10:00', fixed:false, ord:5  },
  { d:6, cat:'school',    title:'MAT 141 – Logique & Mathématiques Discrètes II — Dr PINDRA',              s:'10:00', e:'12:00', fixed:true,  ord:6  },
  { d:6, cat:'travel',    title:'Travel home',                               s:'12:00', e:'12:30', fixed:false, ord:7  },
  { d:6, cat:'personal',  title:'Déjeuner & repos',                          s:'12:30', e:'13:30', fixed:false, ord:8  },
  { d:6, cat:'skill',     title:'Skill Learning',                            s:'13:30', e:'15:00', fixed:false, ord:9  },
  { d:6, cat:'reading',   title:'Lesson Review',                             s:'15:00', e:'16:30', fixed:false, ord:10 },
  { d:6, cat:'reading',   title:'Reading',                                   s:'16:30', e:'17:00', fixed:false, ord:11 },
  { d:6, cat:'personal',  title:'Talk to girlfriend',                        s:'17:00', e:'17:10', fixed:false, ord:12 },
  { d:6, cat:'bilingual', title:'Bilingual Training',                        s:'17:30', e:'18:30', fixed:false, ord:13 },
  { d:6, cat:'gym',       title:'Gym',                                        s:'18:30', e:'20:00', fixed:false, ord:14 },
  { d:6, cat:'reading',   title:'Reading (extended session)',                s:'20:30', e:'21:30', fixed:false, ord:15 },
  { d:6, cat:'personal',  title:'Se détendre / temps libre / social',        s:'21:30', e:'22:30', fixed:false, ord:16 },

  // ── SUNDAY (rest & recharge) ──────────────────────────────────────────────
  { d:0, cat:'personal',  title:'Wake up slowly, breakfast',                 s:'06:00', e:'07:30', fixed:false, ord:1  },
  { d:0, cat:'bilingual', title:'Bilingual Training (TED Talk / documentary)', s:'08:00', e:'09:00', fixed:false, ord:2 },
  { d:0, cat:'skill',     title:'Skill Learning',                            s:'09:00', e:'10:30', fixed:false, ord:3  },
  { d:0, cat:'reading',   title:'Reading (extended session)',                s:'10:30', e:'12:00', fixed:false, ord:4  },
  { d:0, cat:'personal',  title:'Déjeuner, famille, repos',                  s:'12:00', e:'14:00', fixed:false, ord:5  },
  { d:0, cat:'personal',  title:'Talk to girlfriend',                        s:'14:00', e:'14:10', fixed:false, ord:6  },
  { d:0, cat:'personal',  title:'Projets / réflexion personnelle',           s:'14:30', e:'16:00', fixed:false, ord:7  },
  { d:0, cat:'personal',  title:"Visit brother's construction site",         s:'16:00', e:'17:00', fixed:false, ord:8  },
  { d:0, cat:'personal',  title:'Planifier la semaine / journal',            s:'17:00', e:'18:00', fixed:false, ord:9  },
  { d:0, cat:'personal',  title:'Repos',                                     s:'18:00', e:'18:30', fixed:false, ord:10 },
  { d:0, cat:'gym',       title:'Gym (longer session)',                       s:'19:00', e:'20:30', fixed:false, ord:11 },
  { d:0, cat:'reading',   title:'Reading',                                   s:'21:00', e:'22:00', fixed:false, ord:12 },
  { d:0, cat:'personal',  title:'Se détendre / préparer lundi',              s:'22:00', e:'22:30', fixed:false, ord:13 },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM schedule_templates');
    for (const t of templates) {
      await client.query(
        `INSERT INTO schedule_templates
           (day_of_week, category, title, scheduled_start, scheduled_end, is_fixed, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [t.d, t.cat, t.title, t.s, t.e, t.fixed, t.ord]
      );
    }
    await client.query('COMMIT');
    console.log(`Seeded ${templates.length} schedule templates`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
