import * as React from "react";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { VSCodeBadge, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import {
  isCompletedAnalysisRepoStatus,
  VariantAnalysisRepoStatus,
  VariantAnalysisScannedRepositoryDownloadStatus,
} from "../../remote-queries/shared/variant-analysis";
import { formatDecimal } from "../../pure/number";
import {
  Codicon,
  ErrorIcon,
  LoadingIcon,
  SuccessIcon,
  WarningIcon,
} from "../common";
import { RepositoryWithMetadata } from "../../remote-queries/shared/repository";
import {
  AnalysisAlert,
  AnalysisRawResults,
} from "../../remote-queries/shared/analysis-result";
import { vscode } from "../vscode-api";
import { AnalyzedRepoItemContent } from "./AnalyzedRepoItemContent";
import StarCount from "../common/StarCount";
import { LastUpdated } from "../common/LastUpdated";

// This will ensure that these icons have a className which we can use in the TitleContainer
const ExpandCollapseCodicon = styled(Codicon)``;

const TitleContainer = styled.button`
  display: flex;
  gap: 0.5em;
  align-items: center;
  width: 100%;

  color: var(--vscode-editor-foreground);
  background-color: transparent;
  border: none;
  cursor: pointer;

  &:disabled {
    cursor: default;

    ${ExpandCollapseCodicon} {
      color: var(--vscode-disabledForeground);
    }
  }
`;

const VisibilityText = styled.span`
  font-size: 0.85em;
  color: var(--vscode-descriptionForeground);
`;

const MetadataContainer = styled.div`
  display: flex;
  margin-left: auto;
`;

type VisibilityProps = {
  isPrivate?: boolean;
};

const Visibility = ({ isPrivate }: VisibilityProps) => {
  if (isPrivate === undefined) {
    return null;
  }
  return <VisibilityText>{isPrivate ? "private" : "public"}</VisibilityText>;
};

const getErrorLabel = (
  status:
    | VariantAnalysisRepoStatus.Failed
    | VariantAnalysisRepoStatus.TimedOut
    | VariantAnalysisRepoStatus.Canceled,
): string => {
  switch (status) {
    case VariantAnalysisRepoStatus.Failed:
      return "Failed";
    case VariantAnalysisRepoStatus.TimedOut:
      return "Timed out";
    case VariantAnalysisRepoStatus.Canceled:
      return "Canceled";
  }
};

export type RepoRowProps = {
  // Only fullName is required
  repository: Partial<RepositoryWithMetadata> &
    Pick<RepositoryWithMetadata, "fullName">;
  status?: VariantAnalysisRepoStatus;
  downloadStatus?: VariantAnalysisScannedRepositoryDownloadStatus;
  resultCount?: number;

  interpretedResults?: AnalysisAlert[];
  rawResults?: AnalysisRawResults;

  selected?: boolean;
  onSelectedChange?: (repositoryId: number, selected: boolean) => void;
};

const canExpand = (
  status: VariantAnalysisRepoStatus | undefined,
  downloadStatus: VariantAnalysisScannedRepositoryDownloadStatus | undefined,
): boolean => {
  if (!status) {
    return false;
  }

  if (!isCompletedAnalysisRepoStatus(status)) {
    return false;
  }

  if (status !== VariantAnalysisRepoStatus.Succeeded) {
    return true;
  }

  return (
    downloadStatus ===
      VariantAnalysisScannedRepositoryDownloadStatus.Succeeded ||
    downloadStatus === VariantAnalysisScannedRepositoryDownloadStatus.Failed
  );
};

const canSelect = (
  status: VariantAnalysisRepoStatus | undefined,
  downloadStatus: VariantAnalysisScannedRepositoryDownloadStatus | undefined,
) =>
  status == VariantAnalysisRepoStatus.Succeeded &&
  downloadStatus === VariantAnalysisScannedRepositoryDownloadStatus.Succeeded;

const isExpandableContentLoaded = (
  status: VariantAnalysisRepoStatus | undefined,
  downloadStatus: VariantAnalysisScannedRepositoryDownloadStatus | undefined,
  resultsLoaded: boolean,
): boolean => {
  if (!canExpand(status, downloadStatus)) {
    return false;
  }

  if (!status) {
    return false;
  }

  if (status !== VariantAnalysisRepoStatus.Succeeded) {
    return true;
  }

  if (
    downloadStatus === VariantAnalysisScannedRepositoryDownloadStatus.Failed
  ) {
    // If the download has failed, we allow expansion to show the error
    return true;
  }

  return resultsLoaded;
};

export const RepoRow = ({
  repository,
  status,
  downloadStatus,
  resultCount,
  interpretedResults,
  rawResults,
  selected,
  onSelectedChange,
}: RepoRowProps) => {
  const [isExpanded, setExpanded] = useState(false);
  const resultsLoaded = !!interpretedResults || !!rawResults;
  const [resultsLoading, setResultsLoading] = useState(false);

  const toggleExpanded = useCallback(async () => {
    if (resultsLoading) {
      return;
    }

    if (
      resultsLoaded ||
      status !== VariantAnalysisRepoStatus.Succeeded ||
      downloadStatus !==
        VariantAnalysisScannedRepositoryDownloadStatus.Succeeded
    ) {
      setExpanded((oldIsExpanded) => !oldIsExpanded);
      return;
    }

    vscode.postMessage({
      t: "requestRepositoryResults",
      repositoryFullName: repository.fullName,
    });

    setResultsLoading(true);
  }, [
    resultsLoading,
    resultsLoaded,
    repository.fullName,
    status,
    downloadStatus,
  ]);

  useEffect(() => {
    if (resultsLoaded && resultsLoading) {
      setResultsLoading(false);
      setExpanded(true);
    }
  }, [resultsLoaded, resultsLoading]);

  const onClickCheckbox = useCallback((e: React.MouseEvent) => {
    // Prevent calling the onClick event of the container, which would toggle the expanded state
    e.stopPropagation();
  }, []);
  const onChangeCheckbox = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      // This is called on first render, but we don't really care about this value
      if (e.target.checked === undefined) {
        return;
      }

      if (!repository.id) {
        return;
      }

      onSelectedChange?.(repository.id, e.target.checked);
    },
    [onSelectedChange, repository],
  );

  const disabled = !canExpand(status, downloadStatus) || resultsLoading;
  const expandableContentLoaded = isExpandableContentLoaded(
    status,
    downloadStatus,
    resultsLoaded,
  );

  return (
    <div>
      <TitleContainer
        onClick={toggleExpanded}
        disabled={disabled}
        aria-expanded={isExpanded}
      >
        <VSCodeCheckbox
          onChange={onChangeCheckbox}
          onClick={onClickCheckbox}
          checked={selected}
          disabled={!repository.id || !canSelect(status, downloadStatus)}
        />
        {isExpanded && (
          <ExpandCollapseCodicon name="chevron-down" label="Collapse" />
        )}
        {!isExpanded && !resultsLoading && (
          <ExpandCollapseCodicon name="chevron-right" label="Expand" />
        )}
        {resultsLoading && <LoadingIcon label="Results are loading" />}
        <VSCodeBadge>
          {resultCount === undefined ? "-" : formatDecimal(resultCount)}
        </VSCodeBadge>
        <span>{repository.fullName}</span>
        <Visibility isPrivate={repository.private} />
        <span>
          {status === VariantAnalysisRepoStatus.Succeeded && <SuccessIcon />}
          {(status === VariantAnalysisRepoStatus.Failed ||
            status === VariantAnalysisRepoStatus.TimedOut ||
            status === VariantAnalysisRepoStatus.Canceled) && (
            <ErrorIcon label={getErrorLabel(status)} />
          )}
          {status === VariantAnalysisRepoStatus.InProgress && (
            <LoadingIcon label="In progress" />
          )}
          {!status && <WarningIcon />}
        </span>
        {downloadStatus ===
          VariantAnalysisScannedRepositoryDownloadStatus.InProgress && (
          <LoadingIcon label="Downloading" />
        )}
        {downloadStatus ===
          VariantAnalysisScannedRepositoryDownloadStatus.Failed && (
          <WarningIcon label="Failed to download the results" />
        )}
        <MetadataContainer>
          <div>
            <StarCount starCount={repository.stargazersCount} />
          </div>
          <LastUpdated lastUpdated={repository.updatedAt} />
        </MetadataContainer>
      </TitleContainer>
      {isExpanded && expandableContentLoaded && (
        <AnalyzedRepoItemContent
          status={status}
          downloadStatus={downloadStatus}
          interpretedResults={interpretedResults}
          rawResults={rawResults}
        />
      )}
    </div>
  );
};
