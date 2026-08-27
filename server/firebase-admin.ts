import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getFirebaseDatabase() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: requireEnvironmentVariable('FIREBASE_PROJECT_ID'),
        clientEmail: requireEnvironmentVariable('FIREBASE_CLIENT_EMAIL'),
        privateKey: requireEnvironmentVariable('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    })
  }

  return getFirestore()
}
