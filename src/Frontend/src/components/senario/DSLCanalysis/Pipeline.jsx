// Pipeline.jsx
import { usePipelineStore, PIPELINE_STAGES } from './store/pipelineController';
import PipelineStageWrapper from '../utils/PipelineStageWrapper';
import EmptyState from './preStage/EmptyState';
import ProblemDefineState from './preStage/ProblemDefineState';
// import DataCleaningStage from './stages/DataCleaningStage';
import StageTemplate from './stages/StageTemplate';
import dataCleaningConfig from './stages/Stage_1_DataCeaningConfig';
import dataLoadingAndHypothesisProposalConfig from './stages/Stage_0_DataLoadingAndHypothesisPropose';
import EDAConfig from './stages/Stage_2_EDAstage';
import ModelProposalConfig from './stages/Stage_3_ModelProposal';


import './pipelineAnimations.css';


const DSLCPipeline = ({onAddCell}) => {
    const { currentStage, isAnimating, animationDirection } = usePipelineStore();

    // Render current stage component
    const rendercurrentStage = () => {
        switch(currentStage) {
            case PIPELINE_STAGES.EMPTY:
                return (
                    <PipelineStageWrapper
                        stage={PIPELINE_STAGES.EMPTY}
                        currentStage={currentStage}
                        isAnimating={isAnimating}
                        animationDirection={animationDirection}
                    >
                        <EmptyState 
                            onAddCell={onAddCell}
                            onFileUpload={() => {
                                usePipelineStore.getState().nextStage(PIPELINE_STAGES.PROBLEM_DEFINE);
                            }} 
                        />
                    </PipelineStageWrapper>
                );
            
            case PIPELINE_STAGES.PROBLEM_DEFINE:
                return (
                    <PipelineStageWrapper
                        stage={PIPELINE_STAGES.PROBLEM_DEFINE}
                        currentStage={currentStage}
                        isAnimating={isAnimating}
                        animationDirection={animationDirection}
                    >
                        <ProblemDefineState 
                            confirmProblem={() => {
                                usePipelineStore.getState().nextStage(PIPELINE_STAGES.DATA_LOADING_AND_HYPOTHESIS_PROPOSAL);
                            }}
                        />
                    </PipelineStageWrapper>
                );
                

            case PIPELINE_STAGES.DATA_LOADING_AND_HYPOTHESIS_PROPOSAL:
                return (
                    <PipelineStageWrapper
                        stage={PIPELINE_STAGES.DATA_LOADING_AND_HYPOTHESIS_PROPOSAL}
                        currentStage={currentStage}
                        isAnimating={isAnimating}
                        animationDirection={animationDirection}
                    >
                        <StageTemplate
                        config={dataLoadingAndHypothesisProposalConfig}
                        onComplete={() => {
                            usePipelineStore.getState().nextStage(PIPELINE_STAGES.DATA_LOADING);
                        }} />
                    </PipelineStageWrapper>
                );
                
            case PIPELINE_STAGES.DATA_LOADING:
                return (
                    <PipelineStageWrapper
                        stage={PIPELINE_STAGES.DATA_LOADING}
                        currentStage={currentStage}
                        isAnimating={isAnimating}
                        animationDirection={animationDirection}
                    >
                        <StageTemplate
                        config={dataCleaningConfig}
                        onComplete={() => {
                            usePipelineStore.getState().nextStage(PIPELINE_STAGES.DATA_EXPLORATION);
                        }} />
                    </PipelineStageWrapper>
                );
                
            case PIPELINE_STAGES.DATA_EXPLORATION:
                return (
                    <PipelineStageWrapper
                        stage={PIPELINE_STAGES.DATA_EXPLORATION}
                        currentStage={currentStage}
                        isAnimating={isAnimating}
                        animationDirection={animationDirection}
                    >
                        <StageTemplate
                        config={EDAConfig}
                        onComplete={() => {
                            usePipelineStore.getState().nextStage(PIPELINE_STAGES.MODEL_PROPOSAL);
                        }} />
                    </PipelineStageWrapper>
                );
            
            case PIPELINE_STAGES.MODEL_PROPOSAL:
                return (
                    <PipelineStageWrapper
                        stage={PIPELINE_STAGES.MODEL_PROPOSAL}
                        currentStage={currentStage}
                        isAnimating={isAnimating}
                        animationDirection={animationDirection}
                    >
                        <StageTemplate
                        config={ModelProposalConfig}
                        onComplete={() => {
                            usePipelineStore.getState().nextStage(PIPELINE_STAGES.MODEL_SELECTION);
                        }} />
                    </PipelineStageWrapper>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full">
            {/* Navigation header */}
            {/* <PipelineNavigation /> */}

            {/* Pipeline stage container - ensures proper positioning for animations */}
            <div className="w-full h-full flex items-center justify-center">
                {rendercurrentStage()}
            </div>
        </div>
    );
};

export default DSLCPipeline;