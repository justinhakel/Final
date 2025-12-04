WITH games_parsed AS (
  SELECT
    *,
    CASE
      WHEN instr("Scoring Play", 'TOP ') > 0 THEN substr("Scoring Play", instr("Scoring Play", 'TOP ') + 4, 5)
      ELSE NULL
    END AS scoring_top,
    CASE
      WHEN instr("Scoring Play", ' - ') > 0 THEN trim(substr("Scoring Play", 1, instr("Scoring Play", ' - ') - 1))
      ELSE NULL
    END AS scoring_team
  FROM hurst_game_data
)

-- Preferred: match drives to scoring plays by Week Number, Team and TOP
SELECT
  d."Week Number", d."Team", d."Started: Spot", d."Ended: Spot", d."Ended: How", d."TOP" AS drive_top, g."Date", g."Site",
  g."Temperature", g."Weather", g."Scoring Play", g.scoring_top, g.scoring_team
FROM hurst_drive_data AS d
LEFT JOIN games_parsed AS g
  ON d."Week Number" = g."Week Number"
  AND d."Team" = g.scoring_team
  AND d."TOP" = g.scoring_top
;


SELECT d."Week Number", d."Team", d."Started: Spot", d."Ended: Spot", d."Ended: How", d."TOP",
g."Date", g."Site", g."Temperature", g."Weather", g."Scoring Play"
FROM hurst_drive_data AS d
LEFT JOIN hurst_game_data AS g
	ON d."Week Number" = g."Week Number";
