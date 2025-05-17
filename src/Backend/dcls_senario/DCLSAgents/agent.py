from langchain_community.llms import Ollama
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory, ConversationSummaryBufferMemory,ConversationBufferWindowMemory
from agents import (ProblemDefinitionAndDataCollectionAgent, DataCleaningAndEDA_Agent, 
                    PCSAgent, PredictionAndInferenceAgent, 
                    ResultsEvaluationAgent, ResultsCommunicationAgent)
import os
import shutil
import argparse

# 添加参数解析
parser = argparse.ArgumentParser(description='运行泰坦尼克号生存预测实验')
parser.add_argument('--csv_path', type=str, required=True, help='训练数据CSV文件的路径')
parser.add_argument('--problem_description', type=str, required=True, help='问题描述')
parser.add_argument('--context_description', type=str, required=True, help='上下文描述')
args = parser.parse_args()

# 使用传入的参数
csv_file_path = args.csv_path
problem_description = args.problem_description
context_description = args.context_description

#gpt
'''llm = ChatOpenAI(
    api_key="sk-764TRwBy5slqWZ06TTcPLnQ6RNpfatzEDGHLthIQ9qnRrOC9",
    base_url="https://api.nuwaapi.com/v1",
    model="gpt-4o"
)'''

llm = ChatOpenAI(
    api_key="sk-EXz3GV6bxgS30Jyj5751C85fFaFd4c408e821fF99344462d",
    base_url="https://deepseek.perfxlab.cn/v1",
    model="DeepSeek-V3"
)

'''llm = ChatOpenAI(
    api_key="sk-Ck0fHsu1GG80h2RXJNEgYjyT4qE47Wg0xag0WCUkWblaIsXG",
    base_url="https://api.feidaapi.com/v1",
    model="gpt-4o"
)'''

#print(llm.invoke("你好"))

DATA_DIR = os.path.dirname(os.path.abspath(csv_file_path))
CODE_DIR = os.path.join(DATA_DIR, 'code')

'''
problem_description = "在本期比赛中，您需要预测一个人的年收入是否超过 50,000 美元。预测结果将通过 Precision 来评估预测收入类别与实际收入类别之间的关系。对于测试集中的每个样本，您需要预测其目标变量 income 为 '>50K' 或者 '<=50K'。"

context_description = "本次比赛使用的数据集是 UCI 成人收入（Adult Income）数据集，也称为 Census Income 数据集。该数据来源于 1994 年美国人口普查数据，广泛用于机器学习分类任务中。任务目标是根据个人的社会和经济特征预测其年收入是否高于 50,000 美元。\n\n数据集中包含以下字段：\n\n1. age：年龄\n2. workclass：工作类型（如 Private、Self-emp-not-inc）\n3. fnlwgt：人口普查使用的样本权重\n4. education：受教育程度（如 Bachelors、HS-grad）\n5. education_num：对应教育程度的数值编码\n6. marital_status：婚姻状态\n7. occupation：职业类型（如 Tech-support、Craft-repair）\n8. relationship：与家庭的关系（如 Husband、Not-in-family）\n9. race：种族（如 White、Black）\n10. sex：性别（Male / Female）\n11. capital_gain：资本收益\n12. capital_loss：资本损失\n13. hours_per_week：每周工作小时数\n14. native_country：出生国家\n15. income：目标变量，表示年收入是否超过 50,000 美元（'>50K' 或 '<=50K'）"
'''

'''problem_description = "尝试开发一种算法，预测个人的肥胖风险等级。我们的目标是使用各种生理和生活方式因素来预测一个人属于哪个肥胖风险类别。如果能准确预测个人的肥胖风险水平，医疗保健提供者就可以及早干预，为高风险人群提供更有针对性的预防和治疗方案。"

context_description = "这些数据是基于'肥胖或心血管疾病风险'数据集，通过深度学习模型生成。数据集包含多个预测特征和一个目标变量NObeyesdad（表示不同的肥胖等级）。特征包括个人的饮食习惯、身体活动水平、基本生理指标等信息。该数据集特别适合进行可视化分析、聚类分析和探索性数据分析。评估标准采用准确率进行评分。提交格式需要包含id和对应的NObeyesdad预测类别。"
'''
'''
problem_description = "在本期比赛中，您需要预测客户是否会继续保留账户或关闭账户（即流失）。预测结果将通过ROC曲线下面积来评估预测概率与实际目标之间的关系。对测试集中的每个id，您需要预测目标变量Exited的概率。"

context_description = "本次比赛的数据集（训练集和测试集）是通过在Bank Customer Churn Prediction数据集上训练的深度学习模型生成的。特征分布接近但不完全相同于原始数据集。银行客户流失数据集包含了已离开银行或继续作为客户的银行客户信息，包括以下属性：\n\n1. id：唯一标识符\n2. CustomerId：客户唯一标识符\n3. Surname：客户姓氏\n4. CreditScore：客户信用评分\n5. Geography：客户所在国家（法国、西班牙或德国）\n6. Gender：客户性别（男/女）\n7. Age：客户年龄\n8. Tenure：客户在该银行的年限\n9. Balance：客户账户余额\n10. NumOfProducts：客户使用的银行产品数量（如储蓄账户、信用卡）\n11. HasCrCard：客户是否拥有信用卡（1=是，0=否）\n12. IsActiveMember：是否为活跃会员（1=是，0=否）\n13. EstimatedSalary：客户估计薪资\n14. Exited：客户是否已流失（1=是，0=否）"
'''

'''
problem_description = "欢迎来到2912年，这里需要你的数据科学技能来解开一个宇宙之谜。我们收到了来自四光年外的传输信号，情况不容乐观。太空泰坦尼克号是一个月前发射的星际客轮。船上载有近13,000名乘客，这艘船开始了它的处女航，将移民从我们的太阳系运送到三个围绕附近恒星运行的新宜居行星。在途经半人马座阿尔法星前往第一个目的地——炎热的55昭日星e的途中，毫无防备的太空泰坦尼克号与隐藏在尘埃云中的时空异常相撞。不幸的是，它遭遇了与1000年前其同名船只相似的命运。虽然飞船保持完整，但近一半的乘客被传送到了另一个维度！为了帮助救援队营救失踪的乘客，现在需要你通过飞船受损计算机系统恢复的记录来预测哪些乘客被时空异常传送走了。帮助拯救他们，改变历史！"

context_description = "在这个比赛中，你的任务是预测在太空泰坦尼克号与时空异常相撞期间，哪些乘客被传送到了另一个维度。数据集包含乘客的个人记录，分为训练集（~8700条记录）和测试集（~4300条记录）。特征包括：PassengerId（乘客唯一ID）、HomePlanet（出发星球）、CryoSleep（是否进入休眠状态）、Cabin（舱室号）、Destination（目的地星球）、Age（年龄）、VIP（是否为VIP）、各种设施消费金额（RoomService、FoodCourt、ShoppingMall、Spa、VRDeck）、Name（姓名）以及目标变量Transported（是否被传送）。评估标准采用分类准确率进行评分。"
'''


'''problem_description = "尝试开发一种算法，预测某个特定电子商务网站上的哪些用户会话（用户的 访问行为）最终会以购买结束。我们的目标是使用该算法预测未来用户会话的购买意图。如果你能 预测新访客是否有可能进行购买，那么你可以利用这一信息，比如，对那些预测不太可能购买的用 户提供更慷慨的优惠（希望这样能增加他们购买的可能性）"
context_description = "这些数据是"在线购物者购买意图数据集"，该数据集由 Sakar et al. [2019] 公开提供，可 以从 UCI 机器学习库下载1。该数据包括某电子商务网站在一年期间的 12,330 个访客会话。该数据集包含 17 个预测特征和一个反应变量。每个用户会话的预测特征包括一组变量，描述用 户在会话期间访问的每种类型页面（"管理页面"、"信息页面"和"产品相关页面"）的数量，以及 他们在每种类型页面上花费的时间（"管理页面时长"、"信息页面时长"和"产品相关页面时长"）。"'''

'''problem_description = "使用机器学习创建一个模型，预测哪些乘客在泰坦尼克号沉船中幸存。泰坦尼克号的沉没是历史上最臭名昭著的船难之一。1912年4月15日，在她的首航中，被广泛认为是'不可沉没'的RMS泰坦尼克号在与冰山相撞后沉没。不幸的是，船上的救生艇数量不足，导致2224名乘客和船员中有1502人遇难。虽然生存有一定的运气成分，但似乎某些群体更可能生存。在此挑战中，我们要求你构建一个预测模型，回答以下问题：'哪些类型的人更有可能生存？'使用乘客数据（即姓名、年龄、性别、社会经济阶层等）。在此比赛中，你将获得一个数据集，其中包含乘客信息，如姓名、年龄、性别、社会经济阶层等。该数据集包含船上一部分乘客的详细信息，并且重要的是，将揭示他们是否幸存，也被称为'真实情况'。你的任务是预测乘客是否在泰坦尼克号沉没中幸存。你的得分是你正确预测的乘客百分比。"
context_description = "对于数据集，我们提供每位乘客的结果（也称为真实情况）。数据集包含以下关键特征：\n\n" + \
"1. Survived (生存): 是否存活 (0=否, 1=是)\n" + \
"2. Pclass (舱位等级): 反映社会经济地位的代理变量 (1=上层/一等舱, 2=中层/二等舱, 3=下层/三等舱)\n" + \
"3. Sex (性别): 乘客性别\n" + \
"4. Age (年龄): 以年为单位，不满1岁用小数表示，估计年龄以xx.5格式显示\n" + \
"5. SibSp (兄弟姐妹/配偶数): 包括兄弟、姐妹、继兄弟、继姐妹、丈夫、妻子（不含情人和未婚夫妻）\n" + \
"6. Parch (父母子女数): 包括父母（父亲、母亲）和子女（儿子、女儿、继子、继女）的数量\n" + \
"7. Ticket (票号): 乘客的船票号码\n" + \
"8. Fare (票价): 乘客支付的船票价格\n" + \
"9. Cabin (舱号): 乘客的舱位号码\n" + \
"10. Embarked (登船港): 乘客登船的港口 (C=瑟堡, Q=皇后镇, S=南安普顿)\n\n" + \
"这些特征提供了丰富的信息维度，可以通过特征工程创建新的特征，例如家庭规模（SibSp + Parch）、称谓提取（从姓名中）等。特别注意一些特殊情况：有些儿童是与保姆同行（因此其Parch=0），年龄的估计值使用.5结尾。通过这些特征的组合分析，我们可以探索影响生存概率的各种因素。"'''

problem_agent = ProblemDefinitionAndDataCollectionAgent(memory=ConversationBufferMemory(), llm=llm)

pcs_agent = PCSAgent(memory=ConversationBufferMemory(), llm=llm, problem_description=problem_description, context_description=context_description)

problem_analysis_result = problem_agent.execute_problem_definition(
    csv_file_path, 
    problem_description, 
    context_description
)

pcs_hypotheses = pcs_agent.evaluate_problem_definition(
    problem_description=problem_description,
    context_description=context_description,
    var_json=problem_analysis_result["变量描述"],
    unit_check=problem_analysis_result["观测单位"]
)

clean_agent = DataCleaningAndEDA_Agent(
    memory=ConversationBufferMemory(),
    llm=llm,
    problem_description=problem_description,
    context_description=context_description,
    check_unit=problem_analysis_result["观测单位"],
    var_json=problem_analysis_result["变量描述"],
    hyp_json=pcs_hypotheses
)

cleaning_task_list = clean_agent.generate_cleaning_task_list()

cleaning_operations, data_cleaning_logs = clean_agent.execute_cleaning_tasks(
    cleaning_task_list, 
    csv_file_path
)

'''hypothesis_validation_results = []
for hypothesis in pcs_hypotheses:
    validation_code = clean_agent.generate_hypothesis_validation_code(
        csv_file_path=csv_file_path,
        hypothesis=hypothesis
    )
    code_execution_result = clean_agent.execute_generated_code(validation_code)
    hypothesis_conclusion = clean_agent.analyze_hypothesis_validation_result(code_execution_result)
    
    if hypothesis_conclusion:
        hypothesis_validation_results.extend(hypothesis_conclusion)
    else:
        hypothesis_validation_results.append(
            f"hypothesis验证未完成: '{hypothesis['hypothesis']}'"
        )'''

dataset_name = os.path.splitext(os.path.basename(csv_file_path))[0]

def get_code_path(operation_type: str) -> str:
    """生成标准化代码文件路径"""
    return os.path.join(CODE_DIR, f"{dataset_name}_{operation_type}.py")

clean_csv_file_path = clean_agent.execute_cleaning_operations(
    csv_file_path=csv_file_path,
    operations=cleaning_operations
)

cleaning_code_path = get_code_path('cleaning')
with open(cleaning_code_path, 'r', encoding='utf-8') as f:
    cleaning_code = f.read()

list1 = pcs_agent.execute_stability_analysis(csv_file_path=csv_file_path,cleaning_code=cleaning_code)



# /////////////////////
eda_problem = clean_agent.generate_eda_questions(csv_file_path=clean_csv_file_path)
eda_problem = clean_agent.solve_eda_questions(eda_questions=eda_problem,csv_file_path=clean_csv_file_path)
eda_summary = clean_agent.generate_eda_summary(eda_results=eda_problem)
# /////////////////////

prediction_agent = PredictionAndInferenceAgent(
    problem_description=problem_description,
    context_description=context_description,
    eda_summary=eda_summary,
    memory=ConversationBufferMemory(),
    llm=llm
)

response_var = prediction_agent.identify_response_variable(data_path=clean_csv_file_path)
feature_engineering_methods = prediction_agent.suggest_feature_engineering_methods(data_path=clean_csv_file_path)
model_method = prediction_agent.suggest_modeling_methods()

model_evaluation_report = prediction_agent.train_and_evaluate_combined_models(
    model_methods=model_method,
    feature_engineering_methods=feature_engineering_methods,
    csv_path=clean_csv_file_path
)

stability_analysis_dir = os.path.join(DATA_DIR, 'stability_analysis')
model_code_path = os.path.join(CODE_DIR,'train_models.py')

batch_evaluation_results = prediction_agent.execute_batch_evaluation(
    datasets_dir=stability_analysis_dir,
    model_code_path=model_code_path
)

prediction_agent.summarize_evaluation_results(batch_evaluation_results, clean_csv_file_path)


# 读取已有的评估结果
output_path = os.path.join(DATA_DIR, 'clean_dataset', 'model_evaluation_summary.md')
with open(output_path, 'r', encoding='utf-8') as f:
    report = f.read()

# 初始化 ResultsEvaluationAgent
results_agent = ResultsEvaluationAgent(
    problem_description=problem_description,
    context_description=context_description,
    best_five_result=report,
    memory=ConversationBufferMemory(),
    llm=llm
)

# 设置路径
multiple_datasets_code_path = os.path.join(CODE_DIR, 'train_stability.py')
original_dataset_path = os.path.join(DATA_DIR, 'test.csv')

# 执行生成和评估
test_datasets_results = results_agent.generate_and_execute_test_datasets(
    multiple_datasets_code_path=multiple_datasets_code_path,
    original_dataset_path=original_dataset_path,
    data_dir=DATA_DIR,
)

# 修改最后的评估路径
info = results_agent.generate_and_execute_model_evaluation(
    model_training_code_path=os.path.join(CODE_DIR, 'train_models.py'),
    train_dataset_path=os.path.join(DATA_DIR, 'stability_analysis'),
    eval_dataset_path=os.path.join(DATA_DIR, 'dataset')
)