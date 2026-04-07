// Service Worker for FundingScout Web Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || 'New funding alert',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'funding-alert',
    data: { url: data.url || 'https://fundingscout.io' },
    actions: [{ action: 'open', title: 'View Alert' }],
  }

  event.waitUntil(self.registration.showNotification(data.title || 'FundingScout', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || 'https://fundingscout.io'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if one is open
      for (const client of clientList) {
        if (client.url.includes('fundingscout') && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(url)
    }),
  )
})
