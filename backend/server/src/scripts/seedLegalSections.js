import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connect } from '../../src/config/db.js';
import LegalSection from '../../src/models/LegalSection.js';

dotenv.config();

async function run() {
  await connect();

  const seed = [
    {
      actName: 'Indian Penal Code, 1860',
      sectionNumber: '302',
      title: 'Punishment for murder',
      description: 'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.',
      punishment: 'Death or life imprisonment and fine',
      keywords: ['murder', 'death', 'life imprisonment', 'killing']
    },
    {
      actName: 'Indian Penal Code, 1860',
      sectionNumber: '420',
      title: 'Cheating and dishonestly inducing delivery of property',
      description: 'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person...',
      punishment: 'Imprisonment up to 7 years and fine',
      keywords: ['cheating', 'fraud', 'property', 'dishonestly']
    },
    {
      actName: 'Code of Criminal Procedure, 1973',
      sectionNumber: '154',
      title: 'Information in cognizable cases',
      description: 'Every information relating to the commission of a cognizable offence...',
      punishment: 'N/A - Procedural',
      keywords: ['FIR', 'cognizable', 'information', 'police']
    },
    {
      actName: 'Indian Contract Act, 1872',
      sectionNumber: '10',
      title: 'What agreements are contracts',
      description: 'All agreements are contracts if they are made by the free consent of parties competent to contract...',
      punishment: 'N/A - Civil Law',
      keywords: ['contract', 'agreement', 'consent', 'competent']
    }
  ];

  await LegalSection.deleteMany({});
  await LegalSection.insertMany(seed);
  console.log(`Seeded ${seed.length} legal sections.`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});



