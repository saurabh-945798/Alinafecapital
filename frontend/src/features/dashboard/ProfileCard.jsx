export default function ProfileCard({ profile }) {
  const completion = profile?.profileCompletion || 0;

  return (
    <section className="border rounded p-4">
      <h2 className="font-semibold">Profile Completion</h2>
      <p>{completion}%</p>
      <div className="h-2 bg-gray-200 rounded mt-2">
        <div className="h-2 bg-blue-600 rounded" style={{ width: `${completion}%` }} />
      </div>
    </section>
  );
}
