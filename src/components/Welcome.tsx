export function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-arrow">↑</div>
        <h1>Sun exposure for any yard</h1>
        <p>Enter your address above to see how sunlight moves across your yard during the growing season — accounting for nearby buildings and any trees you place.</p>
        <ul>
          <li>Buildings load automatically from OpenStreetMap</li>
          <li>Tap to drop trees and adjust their height</li>
          <li>Scrub through the day to see shadows live</li>
        </ul>
      </div>
    </div>
  );
}
