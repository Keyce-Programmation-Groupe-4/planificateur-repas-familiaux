import notificationsReducer, { showNotification, hideNotification, initialState } from './notificationsSlice';

describe('notifications slice', () => {
  it('should return the initial state', () => {
    expect(notificationsReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  it('should handle showNotification', () => {
    const previousState = initialState;
    const payload = { title: 'Test Title', body: 'Test Body', severity: 'success' };
    const newState = notificationsReducer(previousState, showNotification(payload));

    expect(newState.title).toEqual(payload.title);
    expect(newState.body).toEqual(payload.body);
    expect(newState.severity).toEqual(payload.severity);
    expect(newState.open).toBe(true);
    expect(newState.key).not.toBeNull(); // key should be set
  });

  it('should handle showNotification with default severity', () => {
    const previousState = initialState;
    const payload = { title: 'Test Title', body: 'Test Body' }; // No severity
    const newState = notificationsReducer(previousState, showNotification(payload));

    expect(newState.severity).toEqual('info'); // Default severity
    expect(newState.open).toBe(true);
  });

  it('should handle hideNotification', () => {
    const previousState = {
      ...initialState,
      title: 'Some Title',
      body: 'Some Body',
      open: true,
      key: 123,
    };
    const newState = notificationsReducer(previousState, hideNotification());

    expect(newState.open).toBe(false);
    // Title, body, key, severity might or might not be reset depending on slice logic.
    // Current slice logic does not reset them on hide, which is fine.
    expect(newState.title).toEqual('Some Title');
  });
});
