const mongoose = require('mongoose')
require('dotenv').config()

const CommunitySubmission = require('../models/CommunitySubmission')

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'
  await mongoose.connect(uri)
  const result = await CommunitySubmission.updateMany(
    { voters: { $exists: false } },
    { $set: { voters: [] } },
  )
  console.log(`Community voters migrated: ${result.modifiedCount}`)
  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error(error)
  await mongoose.disconnect().catch(() => {})
  process.exitCode = 1
})
