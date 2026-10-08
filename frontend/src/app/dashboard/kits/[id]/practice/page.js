import PracticeModeClient from './PracticeModeClient';

export default function Page({ params }) {
  const { id } = params;
  return <PracticeModeClient kitId={id} />;
}
