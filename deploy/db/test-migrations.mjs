import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'fs';
// Runs all migrations on in-process Postgres (PGlite) and checks Phase B constraints. Data is fictional.
const dir = new URL('./migrations/', import.meta.url);
const db = new PGlite({ extensions: { pgcrypto } });
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) { await db.exec(fs.readFileSync(new URL(f, dir), 'utf8')); console.log('ok', f); }
const q=(s)=>db.query(s);
const expectFail=async(n,s)=>{try{await db.exec(s);console.log('FAIL (accepted):',n);process.exitCode=1}catch(e){console.log('pass (rejected):',n)}};
await db.exec(`INSERT INTO "Faculties"(id,name) VALUES('f1','F'); INSERT INTO "Majors"(id,name) VALUES('m1','PE'),('m2','SS');
INSERT INTO "Associations"(id,name) VALUES('a1','Sport'),('a2','Other');
INSERT INTO "AcademicYears"(id,title,status) VALUES('y1','1404-1405','Archived'),('y2','۱۴۰۵-۱۴۰۶','Current');
INSERT INTO "AssociationYears"(id,association,"academicYear") VALUES('ay1','["a1"]','["y2"]'),('ay2','["a2"]','["y2"]'),('ay3','["a1"]','["y1"]');`);
await db.exec(`INSERT INTO "AssociationMajors"("associationYear",major) VALUES('["ay1"]','["m1"]'),('["ay1"]','["m2"]'),('["ay3"]','["m1"]');`);
console.log('pass: two majors (PE + sport sciences) map to one association; same major ok in another year');
await expectFail('second current year',`INSERT INTO "AcademicYears"(title,status) VALUES('1406-1407','Current')`);
await expectFail('bad year format',`INSERT INTO "AcademicYears"(title) VALUES('abc')`);
await expectFail('duplicate association per year',`INSERT INTO "AssociationYears"(association,"academicYear") VALUES('["a1"]','["y2"]')`);
await expectFail('FK unknown association',`INSERT INTO "AssociationYears"(association,"academicYear") VALUES('["zz"]','["y2"]')`);
await expectFail('major mapped to 2 associations same year',`INSERT INTO "AssociationMajors"("associationYear",major) VALUES('["ay2"]','["m1"]')`);
await db.exec(`INSERT INTO "Positions"(id,name) VALUES('p1','Secretary'); INSERT INTO "LeadershipTerms"(id,"academicYear","associationYear",position,status,"personName") VALUES('t1','["y1"]','["ay3"]','["p1"]','Ended','Fictional Test Person')`);
await expectFail('active term without name',`INSERT INTO "LeadershipTerms"("academicYear",position,status) VALUES('["y2"]','["p1"]','Active')`);
await expectFail('edit closed term',`UPDATE "LeadershipTerms" SET "personName"='x' WHERE id='t1'`);
await expectFail('delete closed term',`DELETE FROM "LeadershipTerms" WHERE id='t1'`);
const r=await q(`SELECT m."majorsId" FROM "AssociationMajorsMajors" m JOIN "AssociationMajorsAssociationYears" l USING ("associationMajorsId") WHERE l."associationYearsId"='ay1' ORDER BY 1`);
console.log('link view rows for sport association:', r.rows.map(x=>x.majorsId).join(','));
