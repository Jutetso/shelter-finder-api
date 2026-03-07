import * as admin from 'firebase-admin'

let initialized = false

export function getFirebaseMessaging(): admin.messaging.Messaging {
  if (!initialized) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set')

    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    })
    initialized = true
  }
  return admin.messaging()
}
