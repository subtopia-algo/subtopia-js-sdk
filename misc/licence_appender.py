# ruff: noqa

import glob
import os


def load_license(file_path):
    with open(file_path) as f:
        return f.read()


def update_license(ts_file, license_text):
    marker = "// =============================================================================\n"
    license_lines = [f"// {line}\n" for line in license_text.splitlines()]

    with open(ts_file, "r") as f:
        content = f.readlines()

    begin_index = -1
    end_index = -1
    marker_count = 0
    for i, line in enumerate(content):
        if marker == line:
            marker_count += 1
            if marker_count == 1:
                begin_index = i
            elif marker_count == 2:
                end_index = i
                break

    if begin_index != -1 and end_index != -1:
        content = (
            content[:begin_index]
            + [marker]
            + license_lines
            + [marker]
            + content[end_index + 1 :]
        )
    else:
        content = [marker] + license_lines + [marker] + ["\n"] + content

    with open(ts_file, "w") as f:
        f.writelines(content)


def main():
    folder_path = "src"
    license_file = "misc/licence.header.md"

    license_text = load_license(license_file)
    for root, _, files in os.walk(folder_path):
        for ts_file in glob.glob(os.path.join(root, "*.ts")):
            update_license(ts_file, license_text)


if __name__ == "__main__":
    main()
