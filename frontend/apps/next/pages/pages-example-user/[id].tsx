import { UserPage } from 'app/pages/user'
import Head from 'next/head'
import { createParam } from 'solito'

const { useParam } = createParam<{ id: string }>()

export default function Page() {
  const [id] = useParam('id')
  return (
    <>
      <Head>
        <title>User</title>
      </Head>
      <UserPage id={id} />
    </>
  )
}
