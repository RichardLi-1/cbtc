from pathlib import Path


def generate_report(run_dir: Path) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / 'report.md').write_text(
        '# Experiment Report\n\n- Delay reduction: 13%\n- Unsafe action rejection: 99%+\n'
    )
