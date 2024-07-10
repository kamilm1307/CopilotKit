"use client";

import { useCopilotContext } from "@copilotkit/react-core";
import {
  getPublishedCopilotKitVersion,
  logActions,
  logReadables,
  shouldShowDevConsole,
} from "./utils";
import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CopilotKitIcon,
  ExclamationMarkIcon,
  ExclamationMarkTriangleIcon,
} from "./icons";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { COPILOTKIT_VERSION } from "@copilotkit/shared";
import { SmallSpinnerIcon } from "../chat/Icons";

type VersionStatus = "unknown" | "checking" | "latest" | "update-available" | "outdated";

export function CopilotDevConsole() {
  const currentVersion = COPILOTKIT_VERSION;
  const context = useCopilotContext();

  // to prevent hydration errors, ensure that the component renders the same content
  // server-side as it does during the initial client-side render to prevent a hydration
  // mismatch
  // see: https://nextjs.org/docs/messages/react-hydration-error#solution-1-using-useeffect-to-run-on-the-client-only

  const [showDevConsole, setShowDevConsole] = useState(false);

  useEffect(() => {
    setShowDevConsole(shouldShowDevConsole(context.showDevConsole));
  }, [context.showDevConsole]);

  const dontRunTwiceInDevMode = useRef(false);
  const [versionStatus, setVersionStatus] = useState<VersionStatus>("unknown");
  const [latestVersion, setLatestVersion] = useState<string>("");

  const checkForUpdates = (force: boolean = false) => {
    setVersionStatus("checking");
    getPublishedCopilotKitVersion(currentVersion, force)
      .then((v) => {
        setLatestVersion(v.latest);
        if (v.current === v.latest) {
          setVersionStatus("latest");
        } else if (v.severity !== "low") {
          setVersionStatus("outdated");
        } else {
          setVersionStatus("update-available");
        }
      })
      .catch((e) => {
        console.error(e);
        setVersionStatus("unknown");
      });
  };

  useEffect(() => {
    if (dontRunTwiceInDevMode.current === true) {
      return;
    }
    dontRunTwiceInDevMode.current = true;

    checkForUpdates();
  }, []);

  if (!showDevConsole) {
    return null;
  }
  return (
    <div
      className={
        "copilotKitDevConsole " +
        (versionStatus === "update-available" ? "copilotKitDevConsoleUpgrade" : "") +
        (versionStatus === "outdated" ? "copilotKitDevConsoleWarnOutdated" : "")
      }
    >
      <div className="copilotKitDevConsoleLogo">
        <a href="https://copilotkit.ai" target="_blank">
          {CopilotKitIcon}
        </a>
      </div>
      <VersionInfo
        showDevConsole={context.showDevConsole}
        versionStatus={versionStatus}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
      />

      <DebugMenuButton setShowDevConsole={setShowDevConsole} checkForUpdates={checkForUpdates} />
    </div>
  );
}

function VersionInfo({
  showDevConsole,
  versionStatus,
  currentVersion,
  latestVersion,
}: {
  showDevConsole: boolean | "auto";
  versionStatus: VersionStatus;
  currentVersion: string;
  latestVersion: string;
}) {
  const [copyStatus, setCopyStatus] = useState<string>("");

  let versionLabel = "";
  let versionIcon: any = "";
  let currentVersionLabel = currentVersion;

  if (versionStatus === "latest") {
    versionLabel = "latest";
    versionIcon = CheckIcon;
  } else if (versionStatus === "checking") {
    versionLabel = "checking";
    versionIcon = SmallSpinnerIcon;
  } else if (versionStatus === "update-available") {
    versionLabel = "update available";
    versionIcon = ExclamationMarkIcon;
    currentVersionLabel = `${currentVersion} → ${latestVersion}`;
  } else if (versionStatus === "outdated") {
    versionLabel = "outdated";
    versionIcon = ExclamationMarkTriangleIcon;
    currentVersionLabel = `${currentVersion} → ${latestVersion}`;
  }

  let asideLabel = "";
  if (showDevConsole === "auto") {
    asideLabel = "(localhost only)";
  } else if (showDevConsole === true) {
    asideLabel = "(always on)";
  }

  const installCommand = [
    `npm install`,
    `@copilotkit/react-core@${latestVersion}`,
    `@copilotkit/react-ui@${latestVersion}`,
    `@copilotkit/react-textarea@${latestVersion}`,
  ].join(" ");

  const handleCopyClick = () => {
    navigator.clipboard.writeText(installCommand.trim()).then(() => {
      setCopyStatus("Command copied to clipboard!");
      setTimeout(() => setCopyStatus(""), 1000);
    });
  };

  return (
    <div className="copilotKitVersionInfo">
      <header>
        COPILOTKIT DEV CONSOLE{showDevConsole === "auto" && <aside>{asideLabel}</aside>}
      </header>
      <section>
        Version: {versionLabel} ({currentVersionLabel}) {versionIcon}
      </section>
      {(versionStatus === "update-available" || versionStatus === "outdated") && (
        <footer>
          <button onClick={handleCopyClick}>{copyStatus || installCommand}</button>
        </footer>
      )}
    </div>
  );
}
export default function DebugMenuButton({
  setShowDevConsole,
  checkForUpdates,
}: {
  setShowDevConsole: (show: boolean) => void;
  checkForUpdates: (force: boolean) => void;
}) {
  const context = useCopilotContext();
  return (
    <div className="bg-black fixed top-24 w-52 text-right">
      <Menu>
        <MenuButton className="copilotKitDebugMenuButton">Debug {ChevronDownIcon}</MenuButton>

        <MenuItems
          transition
          anchor="bottom end"
          className="copilotKitDebugMenu"
          style={{ zIndex: 40 }}
        >
          <MenuItem>
            <button className="copilotKitDebugMenuItem" onClick={() => logReadables(context)}>
              Log Readables
            </button>
          </MenuItem>
          <MenuItem>
            <button className="copilotKitDebugMenuItem" onClick={() => logActions(context)}>
              Log Actions
            </button>
          </MenuItem>
          <MenuItem>
            <button className="copilotKitDebugMenuItem" onClick={() => checkForUpdates(true)}>
              Check for Updates
            </button>
          </MenuItem>
          <hr />
          <MenuItem>
            <button className="copilotKitDebugMenuItem" onClick={() => setShowDevConsole(false)}>
              Hide Dev Console
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}
