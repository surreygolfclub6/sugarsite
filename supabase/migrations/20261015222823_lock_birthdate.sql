-- Age is set once, by server code during onboarding. Members must not be able to edit it afterwards,
-- since the 18+ rule and age filters depend on it.
revoke update (birthdate) on profiles from authenticated;
