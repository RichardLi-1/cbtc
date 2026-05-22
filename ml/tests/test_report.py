from pathlib import Path

from rlcbtc.evaluation.compare import compare_runs
from rlcbtc.reports.generator import generate_report


def test_generate_report_from_comparison(tmp_path: Path):
    baseline = tmp_path / "baseline"
    rl = tmp_path / "rl"
    for run_dir, delay in ((baseline, 50.0), (rl, 40.0)):
        run_dir.mkdir(parents=True)
        (run_dir / "evaluation.json").write_text(
            f'{{"episodes": 1, "delay_mean_sec": {delay}, "delay_p95_sec": {delay}, '
            f'"headway_std_mean_sec": 10.0, "unsafe_action_rate": 0.0}}',
            encoding="utf-8",
        )
    compare_runs(rl, baseline)
    report_path = generate_report(rl)
    text = report_path.read_text(encoding="utf-8")
    assert "Delay reduction: +20.0%" in text
    assert "13%" not in text
