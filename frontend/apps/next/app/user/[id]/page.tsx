'use client'

import { UserPage } from 'app/pages/user'
import { useParams } from 'solito/navigation'

export default function Page() {
  const { id } = useParams()
  return <UserPage id={id as string} />
}
